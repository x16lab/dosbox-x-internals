import { toString } from 'mdast-util-to-string';
import getReadingTime from 'reading-time';

// Injects `minutesRead` (e.g. "3 min read") into every Markdown/MDX entry's
// frontmatter, exposed at render time via `remarkPluginFrontmatter`.
export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
