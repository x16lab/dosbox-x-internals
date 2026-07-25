import { describe, expect, it } from 'vitest';
import { escapeSectionIdMarkers } from '../src/escape.js';

describe('escapeSectionIdMarkers', () => {
  it('escapes a trailing {#id} on a heading line', () => {
    expect(escapeSectionIdMarkers('## A Section {#id}')).toBe('## A Section \\{#id\\}');
  });

  it('handles headings of every depth', () => {
    expect(escapeSectionIdMarkers('### Registers {#cpu-registers}')).toBe(
      '### Registers \\{#cpu-registers\\}'
    );
    expect(escapeSectionIdMarkers('# Chapter One {#one}')).toBe('# Chapter One \\{#one\\}');
  });

  it('leaves non-heading lines untouched', () => {
    const src = 'plain text {#not-a-heading}\n\n> quote {#nope}';
    expect(escapeSectionIdMarkers(src)).toBe(src);
  });

  it('skips fenced code blocks', () => {
    const src = [
      '```ts',
      '## Looks like a heading {#nope}',
      '```',
      '## Real heading {#yes}',
    ].join('\n');
    const out = escapeSectionIdMarkers(src);
    expect(out).toContain('## Looks like a heading {#nope}');
    expect(out).toContain('## Real heading \\{#yes\\}');
  });

  it('handles mixed content and multiple headings', () => {
    const src = ['Intro text', '', '## First {#a}', '', 'Body.', '', '## Second {#b}'].join('\n');
    const out = escapeSectionIdMarkers(src);
    expect(out).toContain('## First \\{#a\\}');
    expect(out).toContain('## Second \\{#b\\}');
    expect(out).toContain('Intro text');
    expect(out).toContain('Body.');
  });
});
