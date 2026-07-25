// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import { remarkReadingTime } from './remark-reading-time.mjs';
import { bookReferences } from 'astro-book-references';

export default defineConfig({
  site: 'https://x16lab.github.io',
  base: '/dosbox-x-internals/',

  integrations: [
    bookReferences({ collection: 'book', startIndex: 0 }),
    mdx(),
    sitemap(),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkReadingTime],
      remarkRehype: { allowDangerousMath: false },
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: true,
    },
  },
});
