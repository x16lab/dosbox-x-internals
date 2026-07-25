import yaml from 'js-yaml';

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Minimal frontmatter splitter + YAML parser. Returns empty data and the
 * full source when no frontmatter block is present.
 */
export function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = FRONTMATTER_RE.exec(source);
  if (!match) {
    return { data: {}, content: source };
  }
  let data: unknown = {};
  try {
    const body = match[1];
    if (body) data = yaml.load(body);
  } catch (error) {
    throw new Error(
      `[astro-book-references] Failed to parse frontmatter YAML:\n${String(error)}`
    );
  }
  const record =
    data !== null && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return { data: record, content: source.slice(match[0].length) };
}
