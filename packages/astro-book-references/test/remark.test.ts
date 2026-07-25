import { readFileSync } from 'node:fs';
import rehypeStringify from 'rehype-stringify';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';
import { describe, expect, it } from 'vitest';
import { escapeSectionIdMarkers } from '../src/escape.js';
import { parseFrontmatter } from '../src/frontmatter.js';
import { buildReferenceIndex } from '../src/indexer.js';
import { remarkBookReferences } from '../src/remark.js';
import { FIXTURES_DIR, chapterUrl, fixturePath } from './helpers.js';

const index = buildReferenceIndex({ collectionDir: FIXTURES_DIR, chapterUrl });

interface RenderOptions {
  requireSectionIds?: boolean;
  numberChapterHeadings?: boolean;
}

function render(
  source: string,
  filePath: string,
  options: RenderOptions = {}
): string {
  const { content } = parseFrontmatter(source);
  const file = new VFile({ path: filePath, value: escapeSectionIdMarkers(content) });
  return unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkBookReferences, { index, ...options })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(file)
    .toString();
}

const WHAT_IS = readFileSync(fixturePath('01-what-is-dosbox-x.mdx'), 'utf8');
const PC_ARCH = readFileSync(fixturePath('02-pc-architecture.mdx'), 'utf8');

describe('remarkBookReferences', () => {
  it('renumbers headings and writes stable ids', () => {
    const html = render(WHAT_IS, fixturePath('01-what-is-dosbox-x.mdx'));
    expect(html).toContain('<h2 id="why">1.1 Why This Book Exists</h2>');
    // hardcoded "1.2 " from the source is replaced, not stacked
    expect(html).toContain('<h2 id="hardware-contract">1.2 The Hardware Contract</h2>');
    expect(html).not.toContain('1.2 1.2');
  });

  it('numbers nested sections hierarchically', () => {
    const html = render(PC_ARCH, fixturePath('02-pc-architecture.mdx'));
    expect(html).toContain('<h2 id="cpu-architecture">2.1 CPU Architecture</h2>');
    expect(html).toContain('<h3 id="cpu-registers">2.1.1 Registers</h3>');
    expect(html).toContain('<h3 id="instruction-decoder">2.1.2 Instruction Decoder</h3>');
    expect(html).toContain('<h2 id="memory-segmentation">2.2 Memory Segmentation</h2>');
  });

  it('rewrites @chapter references into links', () => {
    const html = render(WHAT_IS, fixturePath('01-what-is-dosbox-x.mdx'));
    expect(html).toContain(
      '<a href="/read/pc-architecture">Chapter 2, PC Architecture</a>'
    );
  });

  it('rewrites @section references into links with anchors', () => {
    const html = render(WHAT_IS, fixturePath('01-what-is-dosbox-x.mdx'));
    expect(html).toContain(
      '<a href="/read/pc-architecture#memory-segmentation">Section 2.2, Memory Segmentation</a>'
    );
  });

  it('rewrites @chapter macros in heading text into labeled links', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      '## Loop Back to @chapter(pc-architecture "Chapter 2") {#loop-back}',
      '',
    ].join('\n');
    const html = render(source, fixturePath('09-extra-x.mdx'));
    expect(html).toContain(
      '<h2 id="loop-back">5.1 Loop Back to <a href="/read/pc-architecture">Chapter 2</a></h2>'
    );
    expect(html).not.toContain('@chapter(');
  });

  it('does not transform references inside inline code', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      'Use `@chapter(does-not-exist)` literally in code.',
      '',
    ].join('\n');
    const html = render(source, fixturePath('09-extra-x.mdx'));
    expect(html).toContain('@chapter(does-not-exist)');
    expect(html).not.toContain('<a href=');
  });

  it('throws a friendly error for an unknown chapter reference', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      'See @chapter(does-not-exist).',
      '',
    ].join('\n');
    expect(() =>
      render(source, fixturePath('09-extra-x.mdx'))
    ).toThrow(/Unknown chapter reference:.*does-not-exist/s);
  });

  it('throws a friendly error for an unknown section reference', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      'See @section(cpu-emulation/missing-section).',
      '',
    ].join('\n');
    expect(() =>
      render(source, fixturePath('09-extra-x.mdx'))
    ).toThrow(/Cannot resolve section reference:.*missing-section/s);
  });

  it('throws when requireSectionIds is enabled and an id is missing', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      '## A Heading Without An Id',
      '',
    ].join('\n');
    expect(() =>
      render(source, fixturePath('09-extra-x.mdx'), { requireSectionIds: true })
    ).toThrow(/Section heading without an explicit \{#section-id\}/);
  });

  it('throws on a malformed trailing {#id} marker', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      '## Broken {#not valid}',
      '',
    ].join('\n');
    expect(() =>
      render(source, fixturePath('09-extra-x.mdx'))
    ).toThrow(/Malformed \{#section-id\} marker/);
  });

  it('regenerates the h1 chapter label when numberChapterHeadings is set', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# Chapter 9 — Extra X',
      '',
      '## Something {#something}',
      '',
    ].join('\n');
    const html = render(source, fixturePath('09-extra-x.mdx'), {
      numberChapterHeadings: true,
    });
    // extra-x is 5th chapter -> number 5
    expect(html).toContain('<h1>Chapter 5 — Extra X</h1>');
    expect(html).not.toContain('Chapter 9 —');
  });

  it('leaves chapters untouched when the file is not part of the collection', () => {
    const source = '# Standalone\n\n## Not A Book Section\n\nSee @chapter(pc-architecture).';
    const html = render(source, '/tmp/standalone.md');
    // headings are not numbered, but references still resolve
    expect(html).toContain('<h2>Not A Book Section</h2>');
    expect(html).toContain(
      '<a href="/read/pc-architecture">Chapter 2, PC Architecture</a>'
    );
  });

  it('renders @chapter(..., short) as a compact number-only link', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      'See @chapter(pc-architecture, short).',
      '',
    ].join('\n');
    const html = render(source, fixturePath('09-extra-x.mdx'));
    expect(html).toContain(
      '<a href="/read/pc-architecture">Chapter 2</a>'
    );
    expect(html).not.toContain('Chapter 2,');
  });

  it('renders @section(..., short) as a compact number-only link', () => {
    const source = [
      '---',
      'title: "X"',
      'order: 9',
      'chapterSlug: "extra-x"',
      '---',
      '# X',
      '',
      'See @section(pc-architecture/cpu-registers, short).',
      '',
    ].join('\n');
    const html = render(source, fixturePath('09-extra-x.mdx'));
    expect(html).toContain(
      '<a href="/read/pc-architecture#cpu-registers">Section 2.1.1</a>'
    );
  });
});
