/**
 * `returnTo` sanitisation for the login round trip.
 *
 * An attacker-supplied `?returnTo=` is an open-redirect primitive if it is echoed back into a
 * `Location` header unchecked, so only a same-origin *path* is ever honoured: it must start with a
 * single `/`, must not start with `//` or `/\` (protocol-relative URLs, which browsers resolve to a
 * foreign origin), and must not contain a scheme. Anything else falls back to `/`.
 */
export function sanitizeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // A path may legitimately contain a colon in a query value, but never before the first `/` or
  // `?`, where it would read as a scheme.
  const firstSegment = value.split(/[?#]/, 1)[0];
  if (firstSegment.includes(':')) return fallback;
  return value;
}
