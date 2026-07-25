import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'book'
);

export const fixturePath = (name: string) => join(FIXTURES_DIR, name);

export const chapterUrl = (slug: string) => `/read/${slug}`;
