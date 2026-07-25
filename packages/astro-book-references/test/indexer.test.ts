import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildReferenceIndex, parseHeadings } from '../src/indexer.js';
import { FIXTURES_DIR, chapterUrl } from './helpers.js';

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempBook(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'abr-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'book'), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, 'book', name), content);
  }
  return join(dir, 'book');
}

const VALID_CHAPTER = (slug: string, extra = '') =>
  [
    '---',
    `title: "${slug}"`,
    'description: "x"',
    'order: 1',
    `chapterSlug: "${slug}"`,
    extra,
    '---',
    `# ${slug}`,
    '',
    '## A Section {#a-section}',
    '',
  ].join('\n');

describe('buildReferenceIndex', () => {
  it('indexes chapters and assigns sequential chapter numbers', () => {
    const index = buildReferenceIndex({
      collectionDir: FIXTURES_DIR,
      chapterUrl,
    });

    expect(index.chapterList).toHaveLength(5);
    expect(index.chapterList.map((c) => c.chapterSlug)).toEqual([
      'what-is-dosbox-x',
      'pc-architecture',
      'cpu-emulation',
      'appendix-a-glossary',
      'extra-x',
    ]);

    const ch1 = index.chapters['what-is-dosbox-x'];
    expect(ch1.chapterNumber).toBe(1);
    expect(ch1.title).toBe('What Is DOSBox-X and Why Does It Exist?');
    expect(ch1.part).toBe('foundations');
    expect(ch1.url).toBe('/read/what-is-dosbox-x');

    expect(index.chapters['appendix-a-glossary'].chapterNumber).toBe(4);
    expect(index.chapters['extra-x'].chapterNumber).toBe(5);
  });

  it('honors startIndex when numbering chapters', () => {
    const index = buildReferenceIndex({
      collectionDir: FIXTURES_DIR,
      chapterUrl,
      startIndex: 0,
    });

    expect(index.chapters['what-is-dosbox-x'].chapterNumber).toBe(0);
    expect(index.chapters['pc-architecture'].chapterNumber).toBe(1);
    expect(index.chapters['cpu-emulation'].chapterNumber).toBe(2);
    expect(index.chapters['appendix-a-glossary'].chapterNumber).toBe(3);
    expect(index.chapters['extra-x'].chapterNumber).toBe(4);
    expect(index.chapters['pc-architecture'].sections['cpu-architecture'].number).toBe('1.1');
  });

  it('generates section numbers from the heading hierarchy', () => {
    const index = buildReferenceIndex({
      collectionDir: FIXTURES_DIR,
      chapterUrl,
    });

    const ch1 = index.chapters['what-is-dosbox-x'];
    expect(ch1.sections['why'].number).toBe('1.1');
    expect(ch1.sections['hardware-contract'].number).toBe('1.2');
    expect(ch1.sections['hardware-contract'].title).toBe('The Hardware Contract');

    const arch = index.chapters['pc-architecture'];
    expect(arch.sections['cpu-architecture'].number).toBe('2.1');
    expect(arch.sections['cpu-registers'].number).toBe('2.1.1');
    expect(arch.sections['instruction-decoder'].number).toBe('2.1.2');
    expect(arch.sections['memory-segmentation'].number).toBe('2.2');
  });

  it('builds the flat section index keyed by chapterSlug/sectionId', () => {
    const index = buildReferenceIndex({
      collectionDir: FIXTURES_DIR,
      chapterUrl,
    });
    const section = index.sectionIndex['pc-architecture/memory-segmentation'];
    expect(section).toMatchObject({
      chapterSlug: 'pc-architecture',
      sectionId: 'memory-segmentation',
      number: '2.2',
    });
  });

  it('strips hardcoded section numbers from the extracted title', () => {
    const headings = parseHeadings('## 2.1 The Old Numbered Title {#id}');
    expect(headings[0]).toMatchObject({ text: 'The Old Numbered Title', id: 'id' });
  });

  it('throws when a file has no chapterSlug', () => {
    const dir = tempBook({
      'orphan.mdx': '---\ntitle: "No Slug"\norder: 1\n---\n# Orphan\n',
    });
    expect(() => buildReferenceIndex({ collectionDir: dir, chapterUrl })).toThrow(
      /chapterSlug/
    );
  });

  it('throws on duplicate chapterSlugs', () => {
    const dir = tempBook({
      'a.mdx': VALID_CHAPTER('duplicate'),
      'b.mdx': VALID_CHAPTER('duplicate'),
    });
    expect(() => buildReferenceIndex({ collectionDir: dir, chapterUrl })).toThrow(
      /Duplicate chapterSlug "duplicate"/
    );
  });

  it('throws on duplicate section ids within a chapter', () => {
    const dir = tempBook({
      'a.mdx': [
        '---',
        'title: "A"',
        'order: 1',
        'chapterSlug: "a"',
        '---',
        '# A',
        '',
        '## First {#dup}',
        '',
        '## Second {#dup}',
        '',
      ].join('\n'),
    });
    expect(() => buildReferenceIndex({ collectionDir: dir, chapterUrl })).toThrow(
      /Duplicate section identifier "dup"/
    );
  });

  it('throws on a malformed trailing {#id} marker', () => {
    const dir = tempBook({
      'a.mdx': [
        '---',
        'title: "A"',
        'order: 1',
        'chapterSlug: "a"',
        '---',
        '# A',
        '',
        '## Broken {#not a valid id}',
        '',
      ].join('\n'),
    });
    expect(() => buildReferenceIndex({ collectionDir: dir, chapterUrl })).toThrow(
      /Malformed \{#section-id\} marker/
    );
  });

  it('enforces requireSectionIds when enabled', () => {
    const dir = tempBook({
      'a.mdx': [
        '---',
        'title: "A"',
        'order: 1',
        'chapterSlug: "a"',
        '---',
        '# A',
        '',
        '## A Heading Without An Id',
        '',
      ].join('\n'),
    });
    expect(() =>
      buildReferenceIndex({ collectionDir: dir, chapterUrl, requireSectionIds: true })
    ).toThrow(/Section heading without an explicit \{#section-id\}/);
  });

  it('throws when the collection directory is empty', () => {
    const dir = tempBook({});
    expect(() => buildReferenceIndex({ collectionDir: dir, chapterUrl })).toThrow(
      /No markdown files found/
    );
  });

  it('resolves @chapter macros embedded in section titles to plain text', () => {
    const dir = tempBook({
      'a.mdx': [
        '---',
        'title: "A"',
        'order: 1',
        'chapterSlug: "a"',
        '---',
        '# A',
        '',
        '## Closed Loop Back to @chapter(b "Chapter 2") {#loop-back}',
        '',
        'Body text references @section(a/loop-back).',
        '',
      ].join('\n'),
      'b.mdx': [
        '---',
        'title: "B"',
        'order: 2',
        'chapterSlug: "b"',
        '---',
        '# B',
        '',
        '## The Loop {#loop}',
        '',
      ].join('\n'),
    });

    const index = buildReferenceIndex({ collectionDir: dir, chapterUrl });
    const section = index.sectionIndex['a/loop-back'];

    expect(section).toBeDefined();
    // The stored title must be plain text: no raw macro syntax leaks, so a
    // cross-page `@section(a/loop-back)` link label never shows `@chapter(`.
    expect(section.title).toBe('Closed Loop Back to Chapter 2');
    expect(section.title).not.toContain('@chapter(');
  });

  it('resolves nested macros in section titles to a fixed point', () => {
    const dir = tempBook({
      'a.mdx': [
        '---',
        'title: "A"',
        'order: 1',
        'chapterSlug: "a"',
        '---',
        '# A',
        '',
        '## See @section(b/loop "the loop") {#see-the-loop}',
        '',
        '## Standalone {#standalone}',
        '',
      ].join('\n'),
      'b.mdx': [
        '---',
        'title: "B"',
        'order: 2',
        'chapterSlug: "b"',
        '---',
        '# B',
        '',
        '## The Loop, which builds on @chapter(a "Chapter 1") {#loop}',
        '',
      ].join('\n'),
    });

    const index = buildReferenceIndex({ collectionDir: dir, chapterUrl });
    // `b/loop`'s title contains `@chapter(a "Chapter 1")`; `a/see-the-loop`'s
    // title contains `@section(b/loop "the loop")`, which expands to use
    // `b/loop`'s title. Both must resolve transitively.
    expect(index.sectionIndex['b/loop'].title).toBe(
      'The Loop, which builds on Chapter 1'
    );
    expect(index.sectionIndex['a/see-the-loop'].title).toBe('See the loop');
  });
});
