/**
 * Vite pre-transform that makes `{#section-id}` authoring work in `.mdx`.
 *
 * MDX parses `{...}` as expressions during tokenization (before any remark
 * plugin can run), so a heading like `## A Section {#id}` fails the build
 * with an acorn "Could not parse expression" error. Escaping the braces
 * (`\{#id\}`) keeps the tokenizer quiet; the escaped text survives to the
 * mdast as the literal string `{#id}`, where `remarkBookReferences` strips
 * the marker and turns it into a stable `id` attribute.
 */
import type { Plugin } from 'vite';

const HEADING_RE = /^(\s*>)*\s*#{1,6}\s+/;
const TRAILING_SECTION_ID = /(\{#[^\n]*\})\s*$/;

/**
 * Escape trailing `{#section-id}` markers on heading lines so the MDX
 * tokenizer does not try to parse them as expressions. Content inside
 * fenced code blocks is left untouched.
 */
export function escapeSectionIdMarkers(source: string): string {
  const lines = source.split('\n');
  let inFence = false;
  let fenceChar = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const fence = /^(`{3,}|~{3,})/.exec(line);
    const fenceMarker = fence ? fence[1] : undefined;
    if (fenceMarker) {
      const marker = fenceMarker.slice(0, 1);
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    if (!HEADING_RE.test(line)) continue;

    lines[i] = line.replace(TRAILING_SECTION_ID, (_match, marker) => {
      return marker.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    });
  }

  return lines.join('\n');
}

/**
 * A Vite plugin that escapes `{#section-id}` markers in `.mdx` sources
 * before `@mdx-js/rolldown` compiles them. Must run before the MDX
 * plugin, so register `bookReferences()` before `mdx()` in the Astro
 * integrations array.
 */
export function sectionIdEscapePlugin(): Plugin {
  return {
    name: 'astro-book-references:escape',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.mdx$/.test(id)) return;
      const escaped = escapeSectionIdMarkers(code);
      if (escaped === code) return;
      return { code: escaped, map: null };
    },
  };
}
