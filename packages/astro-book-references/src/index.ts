import astroBookReferences from './integration.js';

export default astroBookReferences;
export { astroBookReferences as bookReferences };
export { escapeSectionIdMarkers, sectionIdEscapePlugin } from './escape.js';
export { buildReferenceIndex, parseHeadings } from './indexer.js';
export { computeSectionNumbers, sortChapters } from './numbering.js';
export { remarkBookReferences } from './remark.js';
export { resolveReference, resolveReferenceText, REFERENCE_SOURCE_PATTERN } from './resolve.js';
export { joinBase } from './url.js';
export { VIRTUAL_MODULE_ID } from './virtual.js';
export type {
  AstroBookReferencesOptions,
  ChapterInfo,
  ParsedHeading,
  ReferenceIndex,
  RemarkPluginOptions,
  SectionInfo,
} from './types.js';
export type { ParsedReference } from './resolve.js';
