/**
 * Developer-friendly error message builders. All of these are thrown during
 * the build so that broken references and missing identifiers fail fast.
 */

export function unknownChapterError(
  source: string,
  reference: string,
  available: string[]
): string {
  return [
    'ERROR:',
    'Unknown chapter reference:',
    source,
    '',
    'Available chapters:',
    ...available.map((slug) => `- ${slug}`),
  ].join('\n');
}

export function chapterNotFoundInSectionError(
  source: string,
  reference: string,
  chapterSlug: string,
  available: string[]
): string {
  return [
    'ERROR:',
    'Cannot resolve section reference:',
    source,
    '',
    'Chapter not found:',
    chapterSlug,
    '',
    'Available chapters:',
    ...available.map((slug) => `- ${slug}`),
  ].join('\n');
}

export function unknownSectionError(
  source: string,
  reference: string,
  chapterSlug: string,
  available: string[]
): string {
  return [
    'ERROR:',
    'Cannot resolve section reference:',
    source,
    '',
    'Chapter exists:',
    chapterSlug,
    '',
    'Available sections:',
    ...available.map((id) => `- ${id}`),
  ].join('\n');
}

export function malformedSectionReferenceError(
  source: string,
  reference: string
): string {
  return [
    'ERROR:',
    'Malformed section reference:',
    source,
    '',
    `Use @section(${`chapterSlug/sectionId`}), for example @section(pc-architecture/memory-segmentation).`,
  ].join('\n');
}

export function missingChapterSlugError(file: string): string {
  return [
    'ERROR:',
    'Chapter without a chapterSlug in frontmatter:',
    file,
    '',
    'Filenames must never be used as identifiers. Add a chapterSlug to the frontmatter, e.g.',
    'chapterSlug: "my-chapter"',
  ].join('\n');
}

export function duplicateChapterSlugError(file: string, slug: string): string {
  return [
    'ERROR:',
    `Duplicate chapterSlug "${slug}" in ${file}.`,
    'Chapter identifiers must be unique across the book.',
  ].join('\n');
}

export function missingSectionIdError(
  file: string,
  heading: { text: string; depth: number; line: number }
): string {
  return [
    'ERROR:',
    'Section heading without an explicit {#section-id}:',
    `${heading.text}`,
    `${file}:${heading.line}`,
    '',
    'Add a permanent identifier to the heading, e.g.',
    `${'#'.repeat(heading.depth)} ${heading.text} {#your-section-id}`,
  ].join('\n');
}

export function duplicateSectionIdError(
  file: string,
  chapterSlug: string,
  id: string,
  first: { text: string; line: number },
  second: { text: string; line: number }
): string {
  return [
    'ERROR:',
    `Duplicate section identifier "${id}" in chapter "${chapterSlug}":`,
    `${first.text} (${file}:${first.line})`,
    `${second.text} (${file}:${second.line})`,
    'Section identifiers must be unique within a chapter.',
  ].join('\n');
}

export function malformedSectionIdError(
  file: string,
  heading: { text: string; line: number }
): string {
  return [
    'ERROR:',
    'Malformed {#section-id} marker:',
    `${heading.text}`,
    `${file}:${heading.line}`,
    '',
    'Section ids may only contain letters, digits, "-" and "_", and must be the last element of the heading.',
  ].join('\n');
}
