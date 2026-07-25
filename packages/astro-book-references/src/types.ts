/**
 * A heading as extracted from the raw chapter source during indexing.
 */
export interface ParsedHeading {
  depth: number;
  text: string;
  id?: string;
  line: number;
}

/**
 * A numbered, referenceable section within a chapter.
 */
export interface SectionInfo {
  chapterSlug: string;
  sectionId: string;
  title: string;
  /** Generated hierarchical number, e.g. `"1.2"` or `"5.1.1"`. */
  number: string;
  depth: number;
  line: number;
}

/**
 * A numbered chapter in the book.
 */
export interface ChapterInfo {
  chapterSlug: string;
  title: string;
  order: number;
  part?: string;
  draft: boolean;
  /** Absolute path of the source file. */
  file: string;
  /** Generated sequential chapter number, starting at 1. */
  chapterNumber: number;
  /** URL of the chapter page (includes the site `base`). */
  url: string;
  /** Sections of this chapter, keyed by section id. */
  sections: Record<string, SectionInfo>;
}

/**
 * The full internal reference database produced at build time.
 */
export interface ReferenceIndex {
  /** Chapters keyed by `chapterSlug`. */
  chapters: Record<string, ChapterInfo>;
  /** All chapters in reading order. */
  chapterList: ChapterInfo[];
  /** Sections keyed by `"${chapterSlug}/${sectionId}"`. */
  sectionIndex: Record<string, SectionInfo>;
}

/**
 * Options accepted by the Astro integration.
 */
export interface AstroBookReferencesOptions {
  /** Name of the content collection that holds the book chapters. */
  collection: string;
  /**
   * Chapter number assigned to the first chapter in reading order. Defaults to
   * `1`; pass `0` when a leading chapter (e.g. an unnumbered introduction)
   * should shift the remaining chapters down.
   */
  startIndex?: number;
  /**
   * Site base URL to prefix generated links with. Defaults to
   * `config.base`, so links resolve correctly under GitHub Pages etc.
   */
  base?: string;
  /**
   * Customise the URL for a chapter page. The slug is the chapter's
   * permanent identifier. Defaults to `(slug) => \`/read/${slug}\``.
   */
  chapterUrl?: (slug: string) => string;
  /**
   * Fail the build when a numbered section heading has no explicit
   * `{#section-id}` marker. Defaults to `false`.
   */
  requireSectionIds?: boolean;
  /**
   * When `true`, strip a leading `Chapter N —`-style label from each
   * chapter's `# h1` and regenerate it from the generated chapter number.
   * Defaults to `false`.
   */
  numberChapterHeadings?: boolean;
}

/**
 * Options passed to the remark/MDX transformer.
 */
export interface RemarkPluginOptions {
  index: ReferenceIndex;
  requireSectionIds?: boolean;
  numberChapterHeadings?: boolean;
}
