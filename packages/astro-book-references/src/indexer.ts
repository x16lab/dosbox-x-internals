import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import remarkMdx from 'remark-mdx';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import {
  duplicateChapterSlugError,
  duplicateSectionIdError,
  malformedSectionIdError,
  missingChapterSlugError,
  missingSectionIdError,
} from './errors.js';
import { escapeSectionIdMarkers } from './escape.js';
import { parseFrontmatter } from './frontmatter.js';
import {
  REFERENCE_SOURCE_PATTERN,
  resolveReferenceText,
} from './resolve.js';
import {
  hasMalformedTrailingMarker,
  stripLeadingSectionNumber,
  stripTrailingSectionId,
} from './headings.js';
import { computeSectionNumbers, sortChapters } from './numbering.js';
import type {
  ChapterInfo,
  ParsedHeading,
  ReferenceIndex,
  SectionInfo,
} from './types.js';

export interface IndexerOptions {
  /** Absolute path to `src/content/<collection>`. */
  collectionDir: string;
  /** Builds the final chapter URL (already includes the site base). */
  chapterUrl: (slug: string) => string;
  requireSectionIds?: boolean;
  /** Chapter number of the first chapter in reading order. Defaults to `1`. */
  startIndex?: number;
}

interface RawChapter {
  file: string;
  slug: string;
  title: string;
  order: number;
  part?: string;
  draft: boolean;
  url: string;
  headings: ParsedHeading[];
}

/** Recursively collect `*.md` / `*.mdx` files, mirroring Astro's glob loader. */
function collectMarkdownFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(full, out);
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Parse all headings of a chapter, extracting explicit `{#id}` markers. */
export function parseHeadings(markdown: string): ParsedHeading[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkMdx)
    .parse(escapeSectionIdMarkers(markdown));
  const headings: ParsedHeading[] = [];

  visit(tree, 'heading', (node) => {
    const raw = toString(node);
    const { id, rest } = stripTrailingSectionId(raw);
    const text = stripLeadingSectionNumber(rest).trim();
    headings.push({
      depth: node.depth,
      text,
      id,
      line: node.position?.start.line ?? 0,
    });
  });

  return headings;
}

/**
 * Replace every `@chapter(...)` / `@section(...)` macro in a heading title
 * with its plain-text label. This is what makes macros safe to use inside
 * heading text: without it the raw `@chapter(...)` would leak into the
 * section's `title`, which is then used as the link label of any
 * `@section(...)` reference pointing at it (and into the virtual index's
 * titles), producing visible macro syntax in tooltips, TOCs and search
 * snippets.
 *
 * Titles can nest macros (a `@section` label references another section's
 * title, which may itself contain a macro), so callers run this to a fixed
 * point rather than a single pass.
 */
export function resolveTitleMacros(
  text: string,
  index: ReferenceIndex,
  source: string
): string {
  let current = text;
  let pass = 0;
  while (/(?:@chapter|@section)\([^()\n]*\)/.test(current) && pass < 10) {
    current = current.replace(REFERENCE_SOURCE_PATTERN, (match, kind, arg) => {
      try {
        return resolveReferenceText(kind as 'chapter' | 'section', arg, index, `${source}: ${match}`);
      } catch {
        // Leave unresolved macros in place if they cannot be resolved yet;
        // the fixed-point loop will retry them, and `transformReferences`
        // will report genuine errors at render time.
        return match;
      }
    });
    pass++;
  }
  return current;
}

/**
 * Load every chapter from the content collection, sort them into reading
 * order, assign chapter numbers, derive section numbers from the heading
 * hierarchy, and validate every identifier. Any problem throws a
 * developer-friendly error so the build fails before rendering.
 */
export function buildReferenceIndex(options: IndexerOptions): ReferenceIndex {
  const files = collectMarkdownFiles(options.collectionDir).sort();
  if (files.length === 0) {
    throw new Error(
      `[astro-book-references] No markdown files found in "${options.collectionDir}". Check the "collection" option.`
    );
  }

  const chapters: RawChapter[] = [];
  const seenSlugs = new Set<string>();

  for (const file of files) {
    const { data, content } = parseFrontmatter(readFileSync(file, 'utf8'));

    const slug = typeof data.chapterSlug === 'string' ? data.chapterSlug.trim() : '';
    if (!slug) throw new Error(missingChapterSlugError(file));
    if (seenSlugs.has(slug)) throw new Error(duplicateChapterSlugError(file, slug));
    seenSlugs.add(slug);

    const order = typeof data.order === 'number' ? data.order : Number.POSITIVE_INFINITY;
    const title =
      typeof data.title === 'string' && data.title.trim() ? data.title.trim() : slug;
    const part =
      typeof data.part === 'string' && data.part.trim() ? data.part.trim() : undefined;
    const draft = data.draft === true;

    chapters.push({
      file,
      slug,
      title,
      order,
      part,
      draft,
      url: options.chapterUrl(slug),
      headings: parseHeadings(content),
    });
  }

  const sorted = sortChapters(chapters);
  const index: ReferenceIndex = {
    chapters: {},
    chapterList: [],
    sectionIndex: {},
  };

  sorted.forEach((chapter, position) => {
    const chapterNumber = position + (options.startIndex ?? 1);
    const sections: Record<string, SectionInfo> = {};
    const seenIds = new Map<string, { text: string; line: number }>();
    const numbers = computeSectionNumbers(chapter.headings, chapterNumber);

    chapter.headings.forEach((heading, headingIndex) => {
      if (heading.depth < 2) return;

      if (hasMalformedTrailingMarker(heading.text)) {
        throw new Error(
          malformedSectionIdError(chapter.file, {
            text: heading.text,
            line: heading.line,
          })
        );
      }

      const number = numbers.get(headingIndex)!;

      if (heading.id) {
        const first = seenIds.get(heading.id);
        if (first) {
          throw new Error(
            duplicateSectionIdError(chapter.file, chapter.slug, heading.id, first, {
              text: heading.text,
              line: heading.line,
            })
          );
        }
        seenIds.set(heading.id, { text: heading.text, line: heading.line });

        const section: SectionInfo = {
          chapterSlug: chapter.slug,
          sectionId: heading.id,
          title: heading.text,
          number,
          depth: heading.depth,
          line: heading.line,
        };
        sections[heading.id] = section;
        index.sectionIndex[`${chapter.slug}/${heading.id}`] = section;
      } else if (options.requireSectionIds) {
        throw new Error(
          missingSectionIdError(chapter.file, {
            text: heading.text,
            depth: heading.depth,
            line: heading.line,
          })
        );
      }
    });

    const info: ChapterInfo = {
      chapterSlug: chapter.slug,
      title: chapter.title,
      order: chapter.order,
      part: chapter.part,
      draft: chapter.draft,
      file: chapter.file,
      chapterNumber,
      url: chapter.url,
      sections,
    };
     index.chapters[chapter.slug] = info;
     index.chapterList.push(info);
  });

  // Resolve `@chapter(...)` / `@section(...)` macros embedded in heading
  // titles so the stored `title` (used as cross-page link labels and TOC
  // text) is plain — never the raw macro syntax. Titles can reference each
  // other, so iterate to a fixed point.
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const section of Object.values(index.sectionIndex)) {
      const resolved = resolveTitleMacros(
        section.title,
        index,
        `${section.chapterSlug}/${section.sectionId}`
      );
      if (resolved !== section.title) {
        section.title = resolved;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return index;
}
