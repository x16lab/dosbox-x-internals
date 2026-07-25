import { describe, expect, it } from 'vitest';
import { computeSectionNumbers, sortChapters } from '../src/numbering.js';

describe('computeSectionNumbers', () => {
  it('numbers sections hierarchically from the chapter number', () => {
    const headings = [
      { depth: 1 },
      { depth: 2 },
      { depth: 3 },
      { depth: 3 },
      { depth: 2 },
      { depth: 3 },
      { depth: 2 },
    ];
    const numbers = computeSectionNumbers(headings, 5);
    expect(numbers.get(0)).toBeUndefined(); // h1
    expect(numbers.get(1)).toBe('5.1');
    expect(numbers.get(2)).toBe('5.1.1');
    expect(numbers.get(3)).toBe('5.1.2');
    expect(numbers.get(4)).toBe('5.2');
    expect(numbers.get(5)).toBe('5.2.1');
    expect(numbers.get(6)).toBe('5.3');
  });

  it('matches the spec example for chapter 5', () => {
    const headings = [
      { depth: 2 }, // CPU Architecture
      { depth: 3 }, // Registers
      { depth: 3 }, // Instruction Decoder
    ];
    const numbers = computeSectionNumbers(headings, 5);
    expect(numbers.get(0)).toBe('5.1');
    expect(numbers.get(1)).toBe('5.1.1');
    expect(numbers.get(2)).toBe('5.1.2');
  });

  it('ignores depths outside h2..h6', () => {
    const numbers = computeSectionNumbers([{ depth: 6 }, { depth: 7 }], 1);
    expect(numbers.get(0)).toBe('1.1');
    expect(numbers.get(1)).toBeUndefined();
  });
});

describe('sortChapters', () => {
  const chapters = [
    { slug: 'appendix-a', part: 'appendices', order: 30, title: 'A' },
    { slug: 'intro', part: 'front-matter', order: 0, title: 'Intro' },
    { slug: 'ch1', part: 'foundations', order: 1, title: 'Ch1' },
    { slug: 'ch2', part: 'foundations', order: 2, title: 'Ch2' },
    { slug: 'plain', order: 5, title: 'Plain' },
  ];

  it('orders by part (first appearance), then by order', () => {
    const sorted = sortChapters(chapters).map((c) => c.slug);
    expect(sorted).toEqual(['intro', 'ch1', 'ch2', 'appendix-a', 'plain']);
  });

  it('falls back to order-only when no parts are used', () => {
    const noParts = chapters.map((c) => ({ ...c, part: undefined }));
    const sorted = sortChapters(noParts).map((c) => c.slug);
    expect(sorted).toEqual(['intro', 'ch1', 'ch2', 'plain', 'appendix-a']);
  });
});
