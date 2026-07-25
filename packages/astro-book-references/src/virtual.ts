import type { Plugin } from 'vite';
import type { ReferenceIndex } from './types.js';

export const VIRTUAL_MODULE_ID = 'astro-book-references:index';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

/**
 * A Vite plugin exposing the build-time reference database as a virtual
 * module, so pages can import generated chapter numbers and titles:
 *
 * ```astro
 * import { referenceIndex } from 'astro-book-references:index';
 * ```
 *
 * The data is serialised at config time, which makes numbering a pure
 * build-time concern: the snapshot is identical in dev and production.
 */
export function virtualModulePlugin(index: ReferenceIndex): Plugin {
  return {
    name: 'astro-book-references:virtual',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return;
      const payload = JSON.stringify(index, null, 2);
      return [
        'const referenceIndex = ' + payload + ';',
        'export { referenceIndex };',
        'export default referenceIndex;',
        '',
      ].join('\n');
    },
  };
}
