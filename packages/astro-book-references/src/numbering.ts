/**
 * Heading-level numbering helpers. Numbers are never authored in the source:
 * they are derived from the Markdown hierarchy and the generated chapter
 * number, so chapters and sections can be reorganised freely.
 */

export interface Numberable {
  depth: number;
}

/**
 * Assign hierarchical section numbers to the `h2`+ headings of a single
 * chapter, keyed by the heading's index in the input array.
 *
 * Numbering collapses to the heading levels actually used, so a chapter that
 * opens at `###` numbers it `X.1` rather than `X.1.1.1`.
 *
 * Example (chapter 5):
 *   ## CPU Architecture        -> 5.1
 *   ### Registers              -> 5.1.1
 *   ### Instruction Decoder    -> 5.1.2
 *   ## Memory Model            -> 5.2
 */
export function computeSectionNumbers(
  headings: Numberable[],
  chapterNumber: number
): Map<number, string> {
  const result = new Map<number, string>();
  const counters: number[] = [];
  const usedDepths: number[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    if (!heading) continue;
    const depth = heading.depth;
    if (depth < 2 || depth > 6) continue;

    let level = usedDepths.indexOf(depth);
    if (level === -1) {
      usedDepths.push(depth);
      level = usedDepths.length - 1;
    }

    counters.length = level + 1;
    counters[level] = (counters[level] ?? 0) + 1;

    result.set(i, `${chapterNumber}.${counters.join('.')}`);
  }

  return result;
}

/**
 * The chapter numbers derive from reading order (part grouping, then the
 * frontmatter `order`). Parts are ordered by the first chapter that declares
 * them, so the book's front matter stays ahead of its appendices without
 * hardcoding a part ordering. Chapters without a `part` are grouped after
 * every part, so loose fixtures never leapfrog the book's own structure.
 */
export function sortChapters<T extends { part?: string; order: number }>(
  chapters: T[]
): T[] {
  const byOrder = [...chapters].sort((a, b) => a.order - b.order);
  const partOrder = new Map<string, number>();
  for (const chapter of byOrder) {
    if (chapter.part && !partOrder.has(chapter.part)) {
      partOrder.set(chapter.part, partOrder.size);
    }
  }
  const noPartGroup = partOrder.size;

  return byOrder.sort((a, b) => {
    const group = (c: T) =>
      c.part !== undefined ? (partOrder.get(c.part) ?? 0) : noPartGroup;
    const pa = group(a);
    const pb = group(b);
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });
}
