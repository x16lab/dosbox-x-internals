# astro-book-references

An Astro + MDX integration for book-style publishing. It gives every chapter
and section a **stable, generated number** (never authored in the source),
turns `{#section-id}` heading markers into real anchors, and rewrites
`@chapter(...)` / `@section(...)` cross-references into hyperlinks. Broken
references fail the build, so the book can never ship with a dead link.

## Features

- **Chapter numbers from structure, not filenames.** Chapters are ordered by
  the frontmatter `part` + `order` fields; numbers are derived from reading
  order. Filenames are never used as identifiers.
- **Section numbers from the heading hierarchy.** `### Registers {#cpu-registers}`
  inside `## CPU Architecture` becomes `5.1.1` — always consistent with the
  chapter number and the heading depth, with no hardcoded numbers to keep in
  sync.
- **Stable `{#section-id}` anchors.** Write the marker once; the visible
  heading text may change freely without breaking links.
- **`@chapter(slug)` / `@section(chapterSlug/sectionId)` references.** The
  plugin resolves them to links such as `Chapter 1, What Is DOSBox-X…` and
  `Section 1.2, The Hardware Contract`, and fails the build on anything that
  does not resolve.
- **Works everywhere, including inside headings.** Because titles are resolved
  to plain text at index time, a macro embedded in an `##` heading still
  produces a clean link label (and a clean `<title>` / tooltip) — the raw
  `@chapter(...)` syntax never leaks into a link label, TOC, or search
  snippet. References inside inline code and fenced code blocks are left
  untouched.
- **An optional explicit label.** `@chapter(slug, "Chapter 3")` (the label may
  be comma- or whitespace-separated) overrides the generated display text. This
  is the right tool for compact titles, e.g.

  ```mdx
  ## Loop Back to @chapter(main-loop-and-event-scheduler "Chapter 3") {#loop-back}
  ```

   renders the visible heading and any link pointing at `{#loop-back}` as
   `Loop Back to Chapter 3`, while still linking to the right chapter. Omit the
   label to use the default `Chapter N, Title` / `Section N.M, Title` text.

   - **A compact number-only label.** A bare `short` keyword in the label slot
     renders just the generated number — `Chapter N` / `Section N.M` — with no
     title, so a cross-reference never gets unwieldy even when the chapter title
     is long:

     ```mdx
     The technique is described in @chapter(pc-architecture, short).
     ```

     The keyword must be comma- or whitespace-separated from the identifier
     (`@chapter(slug, short)` or `@chapter(slug short)`); a slug that merely
     ends in the letters "short" is treated as an ordinary reference. A quoted
     `"short"` is an explicit label, not the keyword. Use the explicit-label form
     when you need fully custom text; use `short` when the number alone suffices.
- **Build-time validation.** Unknown chapters, unknown sections, duplicate
  identifiers, missing `chapterSlug`s and malformed markers all produce a
  descriptive error.

## Installation

```sh
npm install astro-book-references
```

Add the integration to `astro.config.mjs`, **before** `mdx()`:

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { bookReferences } from 'astro-book-references';

export default defineConfig({
  integrations: [bookReferences({ collection: 'book' }), mdx()],
});
```

The integration must run before the MDX integration: it registers a Vite
transform that pre-processes `.mdx` sources so the MDX tokenizer does not try
to parse `{#section-id}` as a JSX expression.

## Chapter frontmatter

Each chapter in the collection needs:

```yaml
---
title: "What Is DOSBox-X and Why Does It Exist?"
description: "…"
order: 1
chapterSlug: "what-is-dosbox-x"
part: "foundations"
draft: false   # optional, defaults to false
---
```

- `chapterSlug` — the permanent identifier used in URLs and references.
- `order` — ordering within its part.
- `part` — optional grouping; parts are ordered by their first appearance.

## Writing headings and references

```mdx
# What Is DOSBox-X and Why Does It Exist?

The compatibility problem is explained in @chapter(pc-architecture).

## The Hardware Contract {#hardware-contract}

DOS software's real API is the hardware's register map, as discussed in
@section(pc-architecture/memory-segmentation).
```

- `## Heading {#section-id}` sets the anchor and the generated number
  (e.g. `1.2`). Hardcoded numeric prefixes such as `## 1.2 The Hardware Contract`
  are stripped and replaced by the generated number.
- `@chapter(pc-architecture)` links to the chapter page.
- `@section(pc-architecture/memory-segmentation)` links to the section
  anchor on the chapter page.
- Macros can be used in heading text too. Add an optional label to control
  the display text: `@chapter(pc-architecture, "Chapter 2")`. The label is
  also used as the link text for any `@section(...)` pointing at that heading,
  so titles never show raw macro syntax. Omit the label for the default
  `Chapter N, Title` / `Section N.M, Title` text. Or use the bare `short`
  keyword — `@chapter(pc-architecture, short)` — to render just the generated
  number (`Chapter N`).

References inside inline code and fenced code blocks are left untouched.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `collection` | `string` | — | Name of the content collection holding the chapters. **Required.** |
| `startIndex` | `number` | `1` | Chapter number of the first chapter in reading order. Pass `0` when a leading chapter (e.g. an unnumbered introduction) should shift the remaining chapters down. |
| `base` | `string` | `config.base` | URL base prefix for generated links. |
| `chapterUrl` | `(slug) => string` | `` (slug) => `/read/${slug}` `` | URL of a chapter page. |
| `requireSectionIds` | `boolean` | `false` | Fail the build when a numbered section heading has no `{#section-id}`. |
| `numberChapterHeadings` | `boolean` | `false` | Strip a leading `Chapter N —` label from the `# h1` and regenerate it from the generated chapter number. |

## Using the reference index

The integration exposes the full reference database as a virtual module:

```astro
---
import { referenceIndex } from 'astro-book-references:index';
---
```

It contains `chapters`, `chapterList` and `sectionIndex` with generated
numbers, titles and URLs — useful for a table of contents or prev/next
navigation that never drifts from the content.

## Using the remark plugin directly

For custom pipelines you can use the transformer directly:

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import { remarkBookReferences } from 'astro-book-references';

const index = buildReferenceIndex({ collectionDir, chapterUrl: (slug) => `/read/${slug}` });

const html = await unified()
  .use(remarkParse)
  .use(remarkBookReferences, { index })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(source);
```

## Development

```sh
npm run build     # compile TypeScript to dist/
npm test          # run the vitest suite
npm run typecheck # type-check without emitting
```
