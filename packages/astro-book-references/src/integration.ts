import { isUnifiedProcessor, unified } from '@astrojs/markdown-remark';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroConfig, AstroIntegration } from 'astro';
import { sectionIdEscapePlugin } from './escape.js';
import { buildReferenceIndex } from './indexer.js';
import { remarkBookReferences } from './remark.js';
import type { AstroBookReferencesOptions } from './types.js';
import { joinBase } from './url.js';
import { virtualModulePlugin, VIRTUAL_MODULE_ID } from './virtual.js';

const DEFAULT_CHAPTER_URL = (slug: string) => `/read/${slug}`;

/**
 * Astro integration for book-style publishing. Loads every chapter of the
 * given content collection, generates chapter and section numbers, exposes
 * them as the `astro-book-references:index` virtual module, and injects the
 * remark/MDX transformer that resolves `@chapter()` / `@section()`
 * references and numbers headings.
 */
export default function astroBookReferences(
  options: AstroBookReferencesOptions
): AstroIntegration {
  return {
    name: 'astro-book-references',
    hooks: {
      'astro:config:setup'({ config, updateConfig, logger }) {
        const srcDir = fileURLToPath(config.srcDir);
        const collectionDir = join(srcDir, 'content', options.collection);
        const base = options.base ?? config.base ?? '/';

        const chapterUrl = (slug: string) =>
          joinBase(base, (options.chapterUrl ?? DEFAULT_CHAPTER_URL)(slug));

        const index = buildReferenceIndex({
          collectionDir,
          chapterUrl,
          requireSectionIds: options.requireSectionIds,
          startIndex: options.startIndex,
        });

        const remarkOptions = {
          index,
          requireSectionIds: options.requireSectionIds,
          numberChapterHeadings: options.numberChapterHeadings,
        };

        const processor = config.markdown.processor;
        if (processor) {
          if (isUnifiedProcessor(processor)) {
            updateConfig({
              markdown: {
                processor: unified({
                  ...processor.options,
                  remarkPlugins: [
                    ...(processor.options.remarkPlugins ?? []),
                    [remarkBookReferences, remarkOptions],
                  ],
                }),
              },
            });
          } else {
            logger.warn(
              `[astro-book-references] The custom \`markdown.processor\` is not created by \`unified()\` from \`@astrojs/markdown-remark\`, so the reference remark plugin could not be injected automatically. Add \`remarkBookReferences\` to your processor manually.`
            );
          }
        } else {
          updateConfig({
            markdown: {
              remarkPlugins: [[remarkBookReferences, remarkOptions]],
            },
          });
        }

        updateConfig({
          vite: {
            plugins: [sectionIdEscapePlugin(), virtualModulePlugin(index)],
          },
        });

        logger.info(
          `[astro-book-references] Indexed ${index.chapterList.length} chapters and ` +
            `${Object.keys(index.sectionIndex).length} sections from "${options.collection}" ` +
            `(virtual module: ${VIRTUAL_MODULE_ID}).`
        );
      },
    },
  };
}
