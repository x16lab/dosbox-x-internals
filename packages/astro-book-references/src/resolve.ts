import {
  chapterNotFoundInSectionError,
  malformedSectionReferenceError,
  unknownChapterError,
  unknownSectionError,
} from './errors.js';
import type { ReferenceIndex } from './types.js';

export type ReferenceKind = 'chapter' | 'section';

export interface ResolvedReference {
  kind: ReferenceKind;
  url: string;
  text: string;
}

export interface ParsedReference {
  /** The raw identifier: `chapterSlug` or `chapterSlug/sectionId`. */
  reference: string;
  /** Optional explicit display label, e.g. `"Chapter 3"`. */
  label?: string;
  /**
   * When `true`, the bare `short` keyword was supplied instead of a label.
   * Renders the generated number only — `Chapter N` / `Section N.M` — without
   * the chapter/section title. Mutually exclusive with `label`.
   */
  short?: boolean;
}

/** Matches `@chapter(slug)` and `@section(chapterSlug/sectionId)`, with an optional trailing `"label"`. */
export const REFERENCE_SOURCE_PATTERN = /@(chapter|section)\(([^()\n]*)\)/g;

/**
 * Characters that may delimit an explicit label: the straight ASCII double
 * quote plus its typographic (smart-quote) cousins. Astro 7 enables
 * `remark-smartypants` by default, so by the time a macro is rendered the
 * straight quotes an author wrote (`"Chapter 3"`) may already have become
 * curly (`"Chapter 3"`). We therefore accept every variant as a delimiter;
 * the label content itself never contains quote characters, so the parse is
 * quote-style-agnostic.
 */
const LABEL_QUOTE = '"\u201C\u201D';
const LABEL_PATTERN = new RegExp(
  `^(.*?)\\s*,?\\s*[${LABEL_QUOTE}]([^${LABEL_QUOTE}]*)[${LABEL_QUOTE}]\\s*$`,
  's'
);

/**
 * Matches the bare `short` keyword used to request a compact, number-only label:
 * `@chapter(slug, short)` or `@section(slug/id short)` → `Chapter N` / `Section N.M`.
 *
 * A separator (comma or whitespace) is required before `short`, so a slug that
 * happens to end in the letters "short" — e.g. `@chapter(memory-short)` — is
 * treated as an ordinary reference rather than the keyword. The keyword is
 * checked only after the quoted-label pattern, so a quoted `"short"` label is
 * still treated as an explicit label, not the keyword.
 */
const SHORT_PATTERN = /^(.*?)[\s,]\s*short\s*$/i;

function availableChapterSlugs(index: ReferenceIndex): string[] {
  return index.chapterList.map((chapter) => chapter.chapterSlug);
}

/**
 * Split the contents of a `@chapter(...)` / `@section(...)` macro into its
 * identifier and an optional display override:
 *
 * `@chapter(interpreter-core)`                      -> `{ reference: "interpreter-core" }`
 * `@chapter(pc-architecture, "Chapter 2")`          -> `{ reference: "pc-architecture", label: "Chapter 2" }`
 * `@chapter(pc-architecture, short)`                -> `{ reference: "pc-architecture", short: true }`
 * `@section(pc-architecture/memory-segmentation)`   -> `{ reference: "pc-architecture/memory-segmentation" }`
 * `@section(pc-architecture/memory-segmentation, short)` -> `{ reference: "...", short: true }`
 *
 * The trailing argument may be either a quoted explicit label (the right tool
 * for a one-off compact title) or the bare `short` keyword (the right tool for
 * a compact, number-only label that always tracks the generated number). The
 * two are mutually exclusive and the quoted form always wins when both are
 * present. The label/keyword may be comma- or whitespace-separated from the
 * identifier and may be wrapped in straight or smart quotes (Astro's
 * smartypants may curl them). Labels may not themselves contain `(` or `)`.
 */
export function parseReferenceArgs(inner: string): ParsedReference {
  const str = inner.trim();
  if (str === '') return { reference: '' };
  const labelMatch = LABEL_PATTERN.exec(str);
  if (labelMatch) {
    const reference = labelMatch[1];
    const label = labelMatch[2];
    if (!reference) return { reference: '' };
    return { reference: reference.trim(), label };
  }
  const shortMatch = SHORT_PATTERN.exec(str);
  if (shortMatch) {
    const reference = shortMatch[1];
    if (!reference) return { reference: '' };
    return { reference: reference.trim(), short: true };
  }
  return { reference: str };
}

function resolveChapter(
  slug: string,
  index: ReferenceIndex,
  source: string,
  short: boolean = false
): ResolvedReference {
  const chapter = index.chapters[slug];
  if (!chapter) {
    throw new Error(
      unknownChapterError(source, slug, availableChapterSlugs(index))
    );
  }
  return {
    kind: 'chapter',
    url: chapter.url,
    text: short
      ? `Chapter ${chapter.chapterNumber}`
      : `Chapter ${chapter.chapterNumber}, ${chapter.title}`,
  };
}

function resolveSection(
  reference: string,
  index: ReferenceIndex,
  source: string,
  short: boolean = false
): ResolvedReference {
  const parts = reference.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(malformedSectionReferenceError(source, reference));
  }
  const chapterSlug = parts[0];
  const sectionId = parts[1];

  const chapter = index.chapters[chapterSlug];
  if (!chapter) {
    throw new Error(
      chapterNotFoundInSectionError(
        source,
        reference,
        chapterSlug,
        availableChapterSlugs(index)
      )
    );
  }

  const section = index.sectionIndex[`${chapterSlug}/${sectionId}`];
  if (!section) {
    throw new Error(
      unknownSectionError(
        source,
        reference,
        chapterSlug,
        Object.keys(chapter.sections)
      )
    );
  }

  return {
    kind: 'section',
    url: `${chapter.url}#${sectionId}`,
    text: short
      ? `Section ${section.number}`
      : `Section ${section.number}, ${section.title}`,
  };
}

/**
 * Resolve a `@chapter(...)` / `@section(...)` macro. The trailing argument may
 * be either an explicit quoted label — `@chapter(slug, "Custom Label")` —
 * which overrides the display text, or the bare `short` keyword —
 * `@chapter(slug, short)` — which requests a compact, number-only label
 * (`Chapter N` / `Section N.M`). The quoted label always takes precedence.
 */
export function resolveReference(
  kind: ReferenceKind,
  argument: string,
  index: ReferenceIndex,
  source: string
): ResolvedReference {
  const { reference, label, short } = parseReferenceArgs(argument);
  let resolved: ResolvedReference;
  if (kind === 'chapter') {
    resolved = resolveChapter(reference, index, source, short);
  } else {
    resolved = resolveSection(reference, index, source, short);
  }
  if (label !== undefined) return { ...resolved, text: label };
  return resolved;
}

/**
 * Resolve a macro to its plain-text label only — no `<a>` link is built.
 * Used when a macro appears inside a heading title, where we need the label
 * for the index (so cross-page `@section` link tooltips never leak the raw
 * macro syntax) rather than a rendered hyperlink.
 */
export function resolveReferenceText(
  kind: ReferenceKind,
  argument: string,
  index: ReferenceIndex,
  source: string
): string {
  return resolveReference(kind, argument, index, source).text;
}
