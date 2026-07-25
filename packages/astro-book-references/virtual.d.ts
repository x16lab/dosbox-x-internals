/**
 * Ambient type declarations for the `astro-book-references:index` virtual
 * module. Add this package's `virtual` entry to your tsconfig `types` array:
 *
 * ```json
 * { "compilerOptions": { "types": ["astro-book-references/virtual"] } }
 * ```
 *
 * or reference the file directly, so `astro check` / `tsc` can resolve the
 * virtual module import used in pages.
 */
declare module 'astro-book-references:index' {
  import type { ReferenceIndex } from './dist/index.js';

  export const referenceIndex: ReferenceIndex;
  const _default: ReferenceIndex;
  export default _default;
}
