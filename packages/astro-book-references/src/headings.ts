/**
 * Heading text utilities. The `{#id}` marker is the only thing that gives a
 * heading a stable identifier — heading text may change freely.
 */

const TRAILING_SECTION_ID = /\s*\{#([A-Za-z0-9_-]+)\}\s*$/;
const MALFORMED_TRAILING_MARKER = /\{#[\s\S]*?\}\s*$/;

/** A dotted decimal prefix that acts as a stale, hardcoded section number. */
const LEADING_SECTION_NUMBER = /^\d+(\.\d+)+\s+/;

/** A stale, hardcoded `Chapter 1 —` / `Appendix A —` label on an h1. */
const CHAPTER_HEADING_LABEL = /^(Chapter|Appendix|Part)\s+[\w.-]+\s*[—–:-]\s*/;

export interface SectionIdMatch {
  id?: string;
  rest: string;
}

/**
 * Extract a trailing `{#section-id}` marker. Returns the id and the text with
 * the marker removed. When the marker is absent or misplaced, `id` is
 * `undefined` and `rest` is the original text.
 */
export function stripTrailingSectionId(text: string): SectionIdMatch {
  const match = TRAILING_SECTION_ID.exec(text);
  if (!match) return { rest: text };
  return { id: match[1], rest: text.slice(0, match.index) };
}

/**
 * True when the text ends with a `{#...}` marker that could not be parsed as
 * a valid section id (e.g. `{#my section}` or `{#a} {#b}`). Valid trailing
 * markers are removed by `stripTrailingSectionId` first, so reaching this
 * check with a trailing marker means it is malformed.
 */
export function hasMalformedTrailingMarker(text: string): boolean {
  return MALFORMED_TRAILING_MARKER.test(text);
}

/**
 * Remove a hardcoded numeric section prefix such as `1.1 ` from heading text,
 * so the generated number replaces it instead of stacking on top of it.
 */
export function stripLeadingSectionNumber(text: string): string {
  return text.replace(LEADING_SECTION_NUMBER, '');
}

/**
 * Remove a hardcoded `Chapter N —` / `Appendix A —` label from an h1.
 */
export function stripChapterHeadingLabel(text: string): string {
  return text.replace(CHAPTER_HEADING_LABEL, '');
}
