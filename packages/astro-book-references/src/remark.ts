import type { Heading, Link, Root, Text } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import {
  malformedSectionIdError,
  missingSectionIdError,
} from './errors.js';
import {
  hasMalformedTrailingMarker,
  stripChapterHeadingLabel,
  stripLeadingSectionNumber,
  stripTrailingSectionId,
} from './headings.js';
import { computeSectionNumbers } from './numbering.js';
import {
  REFERENCE_SOURCE_PATTERN,
  resolveReference,
} from './resolve.js';
import type { ChapterInfo, ReferenceIndex, RemarkPluginOptions } from './types.js';

interface HeadingOptions {
  requireSectionIds: boolean;
  numberChapterHeadings: boolean;
}

type AnyParent = { children: unknown[] };

function normalizeFile(file: VFile): string | undefined {
  const candidate = file.history[0] ?? file.path;
  if (!candidate) return undefined;
  if (typeof candidate === 'string' && candidate.startsWith('file://')) {
    return decodeURIComponent(candidate.replace(/^file:\/\//, ''));
  }
  return typeof candidate === 'string' ? candidate : undefined;
}

function findChapterForFile(
  index: ReferenceIndex,
  file: VFile
): ChapterInfo | undefined {
  const filePath = normalizeFile(file);
  if (!filePath) return undefined;

  const byPath = index.chapterList.find((c) => c.file === filePath);
  if (byPath) return byPath;

  const basename = filePath.split(/[\\/]/).pop();
  if (!basename) return undefined;
  return index.chapterList.find((c) => c.file.split(/[\\/]/).pop() === basename);
}

function lineOf(node: Heading): number {
  return node.position?.start.line ?? 0;
}

/**
 * Strip a hardcoded numeric section prefix (`## 1.1 The IBM PC`) from the
 * heading's first text child so the generated number replaces it.
 */
function stripLeadingNumber(node: Heading): void {
  const first = node.children[0];
  if (first?.type === 'text') {
    const stripped = stripLeadingSectionNumber(first.value);
    if (stripped !== first.value) {
      if (stripped.trim() === '') {
        node.children.shift();
      } else {
        first.value = stripped;
      }
    }
  }
}

/**
 * Extract a trailing `{#section-id}` marker from the heading's last text
 * child, remove it from the AST, and return the id.
 */
function extractTrailingSectionId(node: Heading): string | undefined {
  const last = node.children[node.children.length - 1];
  if (last?.type === 'text') {
    const { id, rest } = stripTrailingSectionId(last.value);
    if (id) {
      if (rest.trim() === '') {
        node.children.pop();
      } else {
        last.value = rest;
      }
      return id;
    }
  }
  return undefined;
}

function setHeadingId(node: Heading, id: string): void {
  const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
  node.data = {
    ...node.data,
    hProperties: { ...(data.hProperties ?? {}), id },
  };
}

/**
 * Number every `h2`+ heading of a chapter, give headings their stable id,
 * and — when configured — regenerate the `h1` chapter label.
 */
function transformHeadings(
  tree: Root,
  chapter: ChapterInfo,
  options: HeadingOptions
): void {
  const allHeadings: Heading[] = [];
  visit(tree, 'heading', (node) => {
    allHeadings.push(node);
  });

  const sections = allHeadings.filter((node) => node.depth >= 2);
  const numbers = computeSectionNumbers(sections, chapter.chapterNumber);

  sections.forEach((node, index) => {
    stripLeadingNumber(node);
    const id = extractTrailingSectionId(node);

    const remaining = toString(node);
    if (hasMalformedTrailingMarker(remaining)) {
      throw new Error(
        malformedSectionIdError(chapter.file, {
          text: remaining,
          line: lineOf(node),
        })
      );
    }

    if (id) {
      setHeadingId(node, id);
    } else if (options.requireSectionIds) {
      throw new Error(
        missingSectionIdError(chapter.file, {
          text: remaining,
          depth: node.depth,
          line: lineOf(node),
        })
      );
    }

    const number = numbers.get(index);
    if (number) {
      node.children.unshift({ type: 'text', value: `${number} ` });
    }
  });

  allHeadings.forEach((node) => {
    if (node.depth !== 1) return;

    const id = extractTrailingSectionId(node);
    if (id) setHeadingId(node, id);

    if (hasMalformedTrailingMarker(toString(node))) {
      throw new Error(
        malformedSectionIdError(chapter.file, {
          text: toString(node),
          line: lineOf(node),
        })
      );
    }

    if (options.numberChapterHeadings) {
      const first = node.children[0];
      if (first?.type === 'text') {
        first.value = stripChapterHeadingLabel(first.value);
      }
      node.children.unshift({
        type: 'text',
        value: `Chapter ${chapter.chapterNumber} — `,
      });
    }
  });
}

/**
 * Split a text node on `@chapter(...)` / `@section(...)` patterns, producing
 * a sequence of text and link nodes. `filePath` only enriches error reports.
 */
function splitTextNode(
  value: string,
  index: ReferenceIndex,
  filePath: string | undefined
): Array<Text | Link> {
  const parts: Array<Text | Link> = [];
  let last = 0;
  let found = false;

  for (const match of value.matchAll(REFERENCE_SOURCE_PATTERN)) {
    found = true;
    const before = value.slice(last, match.index);
    if (before) parts.push({ type: 'text', value: before });

    const kind = match[1];
    const argument = match[2];
    if (!kind || !argument) continue;
    const source = `${filePath ? `${filePath}: ` : ''}${match[0]}`;

    const resolved = resolveReference(kind as 'chapter' | 'section', argument, index, source);
    parts.push({
      type: 'link',
      url: resolved.url,
      children: [{ type: 'text', value: resolved.text }],
    });

    last = match.index + match[0].length;
  }

  if (!found) return [{ type: 'text', value }];

  const tail = value.slice(last);
  if (tail) parts.push({ type: 'text', value: tail });
  return parts;
}

/**
 * Replace inline references with hyperlinks and throw on unresolved
 * references, so a broken reference fails the build.
 */
function transformReferences(
  tree: Root,
  index: ReferenceIndex,
  file: VFile
): void {
  const filePath = normalizeFile(file);

  interface Target {
    node: Text;
    parent: AnyParent;
  }
  const targets: Target[] = [];

  visit(tree, 'text', (node, _index, parent) => {
    if (parent?.type === 'link') return;
    if (!node.value.includes('@chapter(') && !node.value.includes('@section(')) {
      return;
    }
    targets.push({ node, parent: parent as AnyParent });
  });

  for (const { node, parent } of targets) {
    const children = splitTextNode(node.value, index, filePath);
    const only = children[0];
    if (
      children.length === 1 &&
      only?.type === 'text' &&
      only.value === node.value
    ) {
      continue;
    }
    const at = parent.children.indexOf(node);
    if (at === -1) continue;
    parent.children.splice(at, 1, ...children);
  }
}

/**
 * Remark/MDX transformer for book-style content:
 *
 * - renumbers `##`/`###`/… headings from the generated chapter number and the
 *   heading hierarchy, replacing any hardcoded numbers in the source,
 * - turns explicit `{#section-id}` markers into stable `id` attributes and
 *   strips the markers from the visible heading text,
 * - rewrites `@chapter(slug)` and `@section(chapterSlug/sectionId)` into
 *   hyperlinks carrying the generated number and title,
 * - throws a developer-friendly error for unknown references or missing ids.
 *
 * The integration wires this in automatically; you can also use it directly
 * with `unified()` for testing or custom pipelines.
 */
export const remarkBookReferences = (
  options: RemarkPluginOptions
): ((tree: Root, file: VFile) => void) => {
  const requireSectionIds = options.requireSectionIds ?? false;
  const numberChapterHeadings = options.numberChapterHeadings ?? false;

  return (tree, file) => {
    const chapter = findChapterForFile(options.index, file);

    if (chapter) {
      transformHeadings(tree, chapter, { requireSectionIds, numberChapterHeadings });
    }

    transformReferences(tree, options.index, file);
  };
};
