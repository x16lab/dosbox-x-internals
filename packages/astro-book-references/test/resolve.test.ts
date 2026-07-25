import { describe, expect, it } from 'vitest';
import { buildReferenceIndex } from '../src/indexer.js';
import { parseReferenceArgs, resolveReference, resolveReferenceText } from '../src/resolve.js';
import { FIXTURES_DIR, chapterUrl } from './helpers.js';

const index = buildReferenceIndex({ collectionDir: FIXTURES_DIR, chapterUrl });

describe('parseReferenceArgs', () => {
  it('splits a reference from an optional explicit label', () => {
    expect(parseReferenceArgs('pc-architecture')).toEqual({
      reference: 'pc-architecture',
      label: undefined,
    });
  });

  it('strips an optional trailing quoted label', () => {
    expect(parseReferenceArgs('pc-architecture/memory-segmentation, "Section Two"')).toEqual({
      reference: 'pc-architecture/memory-segmentation',
      label: 'Section Two',
    });
  });

  it('allows commas inside the quoted label', () => {
    expect(parseReferenceArgs('pc-architecture, "Chapter 2, PC Architecture"')).toEqual({
      reference: 'pc-architecture',
      label: 'Chapter 2, PC Architecture',
    });
  });

  it('treats a bare string without a comma as a label-less reference', () => {
    expect(parseReferenceArgs('pc-architecture/memory-segmentation')).toEqual({
      reference: 'pc-architecture/memory-segmentation',
    });
  });

  it("splits a label wrapped in Astro's smart/curly quotes", () => {
    expect(parseReferenceArgs('pc-architecture \u201CChapter 2\u201D')).toEqual({
      reference: 'pc-architecture',
      label: 'Chapter 2',
    });
  });

  it('detects the short keyword (comma-separated)', () => {
    expect(parseReferenceArgs('pc-architecture, short')).toEqual({
      reference: 'pc-architecture',
      short: true,
    });
  });

  it('detects the short keyword (whitespace-separated)', () => {
    expect(parseReferenceArgs('pc-architecture short')).toEqual({
      reference: 'pc-architecture',
      short: true,
    });
  });

  it('detects the short keyword for a section reference', () => {
    expect(parseReferenceArgs('pc-architecture/cpu-registers, short')).toEqual({
      reference: 'pc-architecture/cpu-registers',
      short: true,
    });
  });

  it('does not treat a slug ending in "short" as the keyword', () => {
    expect(parseReferenceArgs('memory-short')).toEqual({
      reference: 'memory-short',
    });
  });

  it('treats a quoted "short" as an explicit label, not the keyword', () => {
    expect(parseReferenceArgs('pc-architecture, "short"')).toEqual({
      reference: 'pc-architecture',
      label: 'short',
    });
  });

  it('returns an empty reference for an empty argument', () => {
    expect(parseReferenceArgs('   ')).toEqual({ reference: '' });
  });
});

describe('resolveReference', () => {
  it('resolves @chapter references with generated number and title', () => {
    const ref = resolveReference('chapter', 'pc-architecture', index, '@chapter(pc-architecture)');
    expect(ref).toEqual({
      kind: 'chapter',
      url: '/read/pc-architecture',
      text: 'Chapter 2, PC Architecture',
    });
  });

  it('resolves @section references with generated number and title', () => {
    const ref = resolveReference(
      'section',
      'pc-architecture/memory-segmentation',
      index,
      '@section(pc-architecture/memory-segmentation)'
    );
    expect(ref).toEqual({
      kind: 'section',
      url: '/read/pc-architecture#memory-segmentation',
      text: 'Section 2.2, Memory Segmentation',
    });
  });

  it('throws a spec-shaped error for an unknown chapter', () => {
    let message = '';
    try {
      resolveReference('chapter', 'cpu-core', index, '@chapter(cpu-core)');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ERROR:');
    expect(message).toContain('Unknown chapter reference:');
    expect(message).toContain('@chapter(cpu-core)');
    expect(message).toContain('Available chapters:');
    expect(message).toContain('- what-is-dosbox-x');
    expect(message).toContain('- pc-architecture');
    expect(message).toContain('- cpu-emulation');
  });

  it('throws a spec-shaped error for an unknown section in an existing chapter', () => {
    let message = '';
    try {
      resolveReference(
        'section',
        'cpu-emulation/unknown-section',
        index,
        '@section(cpu-emulation/unknown-section)'
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ERROR:');
    expect(message).toContain('Cannot resolve section reference:');
    expect(message).toContain('@section(cpu-emulation/unknown-section)');
    expect(message).toContain('Chapter exists:');
    expect(message).toContain('cpu-emulation');
    expect(message).toContain('Available sections:');
    expect(message).toContain('- interpreter-core');
    expect(message).toContain('- execution-loop');
    expect(message).toContain('- memory-model');
  });

  it('distinguishes an unknown chapter in a section reference', () => {
    let message = '';
    try {
      resolveReference(
        'section',
        'ghost-chapter/anywhere',
        index,
        '@section(ghost-chapter/anywhere)'
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('Chapter not found:');
    expect(message).toContain('ghost-chapter');
  });

  it('throws a spec-shaped error for a malformed section argument', () => {
    let message = '';
    try {
      resolveReference('section', 'no-slash', index, '@section(no-slash)');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('Malformed section reference:');
    expect(message).toContain('@section(no-slash)');
  });

  it('honors an explicit label for a chapter reference', () => {
    const ref = resolveReference(
      'chapter',
      'pc-architecture, "Chapter Two"',
      index,
      '@chapter(pc-architecture, "Chapter Two")'
    );
    expect(ref).toEqual({
      kind: 'chapter',
      url: '/read/pc-architecture',
      text: 'Chapter Two',
    });
  });

  it('honors an explicit label for a section reference', () => {
    const ref = resolveReference(
      'section',
      'pc-architecture/memory-segmentation, "§2.2"',
      index,
      '@section(pc-architecture/memory-segmentation, "§2.2")'
    );
    expect(ref).toEqual({
      kind: 'section',
      url: '/read/pc-architecture#memory-segmentation',
      text: '§2.2',
    });
  });

  it('still throws for an unknown chapter when a label is present', () => {
    let message = '';
    try {
      resolveReference(
        'chapter',
        'does-not-exist, "Ghost"',
        index,
        '@chapter(does-not-exist, "Ghost")'
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('Unknown chapter reference:');
    expect(message).toContain('does-not-exist');
  });

  it('resolveReferenceText returns the plain label', () => {
    expect(
      resolveReferenceText(
        'chapter',
        'pc-architecture, "Chapter Two"',
        index,
        '@chapter(pc-architecture, "Chapter Two")'
      )
    ).toBe('Chapter Two');
  });

  it('renders a short chapter label with the number only', () => {
    const ref = resolveReference(
      'chapter',
      'pc-architecture, short',
      index,
      '@chapter(pc-architecture, short)'
    );
    expect(ref).toEqual({
      kind: 'chapter',
      url: '/read/pc-architecture',
      text: 'Chapter 2',
    });
  });

  it('renders a short section label with the number only', () => {
    const ref = resolveReference(
      'section',
      'pc-architecture/cpu-registers, short',
      index,
      '@section(pc-architecture/cpu-registers, short)'
    );
    expect(ref).toEqual({
      kind: 'section',
      url: '/read/pc-architecture#cpu-registers',
      text: 'Section 2.1.1',
    });
  });

  it('still throws for an unknown chapter with the short keyword', () => {
    let message = '';
    try {
      resolveReference(
        'chapter',
        'does-not-exist, short',
        index,
        '@chapter(does-not-exist, short)'
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('Unknown chapter reference:');
    expect(message).toContain('does-not-exist');
  });
});
