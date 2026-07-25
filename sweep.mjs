import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildReferenceIndex } from './packages/astro-book-references/dist/index.js';

const BOOK = join(process.cwd(), 'src/content/book');
const startIndex = 0;
const chapterUrl = (s) => `/read/${s}`;
const titles = {
  1: 'What Is DOSBox-X and Why Does It Exist?', 2: 'DOSBox-X Architecture', 3: 'The Main Loop and Event Scheduler',
  4: 'Memory Model and Address Translation', 5: 'The Interpreter Core', 6: 'Dynamic Recompilation',
  7: 'Interrupts, Exceptions, and the PIC', 8: 'VGA/SVGA Emulation', 9: 'DMA and the PIT', 10: 'Sound',
  11: 'Serial, Parallel, and Peripheral I/O', 12: 'The BIOS Layer', 13: 'The DOS Kernel',
  14: 'Timing and Cycle Management', 15: 'Host Abstraction via SDL', 16: 'DOSBox-X-Specific Extensions',
  17: 'Debugging and Instrumentation'
};

function slugify(text) {
  const t = text.replace(/^\d+(\.\d+)+\s+/, '');
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const files = readdirSync(BOOK).filter(f => /\.(md|mdx)$/.test(f));

// ---- Phase A: add {#id} to every heading lacking one (idempotent) ----
let totalIds = 0;
for (const f of files) {
  const path = join(BOOK, f);
  let lines = readFileSync(path, 'utf8').split('\n');
  const seen = new Set(); let changed = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6}\s+)(.*?)(\s*\{#[A-Za-z0-9_-]+\}\s*)?$/.exec(lines[i]);
    if (!m) continue;
    if (m[3]) continue;
    const t = m[2].trim();
    const sl = slugify(t); if (!sl) continue;
    let id = sl, n = 2;
    while (seen.has(id)) id = sl + '-' + (n++);
    seen.add(id);
    lines[i] = `${m[1]}${t} {#${id}}`;
    changed++;
  }
  if (changed) { writeFileSync(path, lines.join('\n')); totalIds += changed; }
}
console.log('Phase A — IDs added:', totalIds);

// ---- Phase B: build index ----
const index = buildReferenceIndex({ collectionDir: BOOK, chapterUrl, startIndex });
const numToSlug = new Map(); for (const c of index.chapterList) numToSlug.set(c.chapterNumber, c.chapterSlug);
const h2ByChapter = new Map();
for (const c of index.chapterList) {
  const h2 = Object.values(c.sections).filter(s => s.depth === 2);
  h2ByChapter.set(c.chapterNumber, h2);
}
console.log('Phase B — chapters:', index.chapterList.length, 'sections:', Object.keys(index.sectionIndex).length);

const stats = { combined: 0, ssingle: 0, srange: 0, sectionWord: 0, chapTitle: 0, chapBare: 0, leftover: [] };

function segRef(numStr) {
  const parts = String(numStr).split(/\./);
  const cN = Number(parts[0]); const M = Number(parts[1]);
  const list = h2ByChapter.get(cN);
  const sec = list && list[M - 1];
  return sec ? `${sec.chapterSlug}/${sec.sectionId}` : null;
}
function resolveRange(rangeStr) {
  const parts = String(rangeStr).split(/[-–]/);
  return parts.map(p => {
    const ref = segRef(p);
    return ref ? `@section(${ref})` : `§ ${p}`;
  }).join('–');
}

const CHAPTER_N = /Chapter\s*(\d+)(?![0-9])/g;
const COMBINED_ARROW = /→\s*Chapter\s*(\d+)(?![0-9])\s*,\s*§\s*(\d+(?:\.\d+)+(?:[–-]\d+(?:\.\d+)+)?)/g;
const COMBINED_PAREN = /\(\s*Chapter\s*(\d+)(?![0-9])\s*,\s*§\s*(\d+(?:\.\d+)+(?:[–-]\d+(?:\.\d+)+)?)\s*\)/g;
const COMBINED_BARE = /Chapter\s*(\d+)(?![0-9])\s*,\s*§\s*(\d+(?:\.\d+)+(?:[–-]\d+(?:\.\d+)+)?)/g;
const SECTION_NUM = /\d+(?:\.\d+)+(?:[–-]\d+(?:\.\d+)+)?/;
const SECTION_REF = new RegExp('[Ss]ect(?:ion)?\\.?\\s*(' + SECTION_NUM.source + ')', 'g');

for (const f of files) {
  const path = join(BOOK, f);
  const before = readFileSync(path, 'utf8');
  // leave YAML frontmatter (description/metadata) untouched — macros there
  // are not rendered through the remark pipeline
  let front = '', body = before;
  const fm = /^---\n([\s\S]*?\n)---\n/.exec(before);
  if (fm) { front = fm[0]; body = before.slice(fm[0].length); }
  let text = body;


  // 1) "→ Chapter N, §N.M" -> "→ @section"
  text = text.replace(COMBINED_ARROW, (m, cN, numStr) => {
    const exp = resolveRange(numStr);
    if (exp.startsWith('@section')) stats.combined++; else stats.leftover.push(f + ':' + m);
    return `→ ${exp}`;
  });

  // 2) "(Chapter N, §N.M)" -> "(@section)"
  text = text.replace(COMBINED_PAREN, (m, cN, numStr) => {
    const exp = resolveRange(numStr);
    if (exp.startsWith('@section')) stats.combined++; else stats.leftover.push(f + ':' + m);
    return `(${exp})`;
  });

  // 3) "Chapter N, §N.M" (bare, e.g. source map table) -> "@section"
  text = text.replace(COMBINED_BARE, (m, cN, numStr) => {
    const exp = resolveRange(numStr);
    if (exp.startsWith('@section')) stats.combined++; else stats.leftover.push(f + ':' + m);
    return exp;
  });

  // 4) standalone §N.M[range]
  text = text.replace(/§\s*(\d+(?:\.\d+)+(?:[–-]\d+(?:\.\d+)+)?)/g, (m, numStr) => {
    const exp = resolveRange(numStr);
    if (exp.startsWith('@section')) stats.ssingle++; else stats.leftover.push(f + ':' + m);
    return exp;
  });

  // 5) "section/sect N.M[range]" word forms
  text = text.replace(/[Ss]ect(?:ion)?\.?\s*(\d+(?:\.\d+)+(?:[–-]\d+(?:\.\d+)+)?)/g, (m, numStr) => {
    const exp = resolveRange(numStr);
    if (exp.startsWith('@section')) stats.sectionWord++; else stats.leftover.push(f + ':' + m);
    return exp;
  });

  // 6) standalone "Chapter N" -> @chapter(slug), skip own h1 title
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^# Chapter \d+/.test(line)) continue;
    lines[i] = line.replace(CHAPTER_N, (m, n) => {
      const num = Number(n); const slug = numToSlug.get(num);
      if (!slug) { stats.leftover.push(f + ':' + m); return m; }
      const idx = line.indexOf(m);
      const after = line.slice(idx + m.length);
      if (after.startsWith(' — ' + titles[num]) || after.startsWith(': ' + titles[num])) {
        stats.chapTitle++;
        return `@chapter(${slug})`;
      }
      stats.chapBare++;
      return `@chapter(${slug})`;
    });
  }
  text = lines.join('\n');
  text = front + text;

  if (text !== before) writeFileSync(path, text);
}

console.log('Phase C stats:', JSON.stringify(stats));
console.log('leftover count:', stats.leftover.length);
stats.leftover.slice(0, 40).forEach(s => console.log('  LEFTOVER:', s));
