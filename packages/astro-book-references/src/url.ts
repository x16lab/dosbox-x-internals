/**
 * Join a site `base` (e.g. `/dosbox-x-internals/`) with a root-absolute path
 * so generated links resolve when the site is served from a subpath.
 */
export function joinBase(base: string, path: string): string {
  const normalized = (base ?? '/').replace(/\/+$/, '');
  const rest = path.startsWith('/') ? path : `/${path}`;
  return normalized ? `${normalized}${rest}` : rest;
}
