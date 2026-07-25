import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const book = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/book' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    part: z.string().optional(),
    chapterSlug: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { book };
