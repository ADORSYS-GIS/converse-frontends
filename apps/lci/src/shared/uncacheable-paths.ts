/**
 * The one list of request paths this app must never serve from any cache — the single source of
 * truth for `src/sw.ts` (see its doc comment for how each Serwist mechanism consumes it) and the
 * thing `src/proxy.test.ts` pins the matcher against.
 *
 * `/api/*` covers both the OIDC redirect legs (`/api/auth/login`, `/api/auth/callback`,
 * `/api/auth/logout` — 307/303s to and from the IdP, carrying single-use `code`/`state`
 * parameters, and setting or clearing the session cookies) and the server-side control-plane
 * proxies (`/api/repositories/[id]/graph`, `.../symbols/[nodeId]/similar`). Every one is
 * authenticated per request against the caller's own session, and a cached navigation response
 * here would replay a spent login, serve a signed-out shell to a signed-in user, swallow a
 * `Set-Cookie`, or leak one viewer's repository data to the next — a cache is origin-scoped and
 * shared across sessions.
 *
 * Deliberately NOT a general "is this public" list: `/branding/*`, `/icons/*` and
 * `manifest.json` are unauthenticated too, and they are exactly the things that SHOULD be cached.
 */

/**
 * Path prefixes, without a trailing slash. A path matches when it equals a prefix exactly or
 * continues with `/`, so `/api` and `/api/repositories` both match while `/apikeys` does not.
 */
export const UNCACHEABLE_PATH_PREFIXES = ['/api'] as const;

/**
 * The prefix list as a single `RegExp`, for the Serwist options that take patterns rather than a
 * predicate (`precacheOptions.navigateFallbackDenylist`).
 */
export const UNCACHEABLE_PATH_PATTERN = new RegExp(
  `^(?:${UNCACHEABLE_PATH_PREFIXES.join('|')})(?:/|$)`
);

/**
 * Whether a URL **pathname** (no origin, no query) is one the service worker must not cache.
 */
export function isUncacheablePath(pathname: string): boolean {
  return UNCACHEABLE_PATH_PATTERN.test(pathname);
}

/**
 * Whether a precache-manifest URL is uncacheable. Manifest entries are root-relative strings
 * (`/icons/icon-192.png`, `/_next/static/chunks/…`) that may carry percent-encoding and a
 * `?__WB_REVISION__` query, so they are parsed rather than prefix-matched. The base is a throwaway
 * origin — only the pathname is ever inspected.
 */
export function isUncacheableUrl(url: string): boolean {
  try {
    return isUncacheablePath(new URL(url, 'https://lci.invalid').pathname);
  } catch {
    return false;
  }
}

/**
 * A Serwist precache-manifest entry, restated structurally rather than imported from `serwist`:
 * that package's types are worker-targeted, and this module is compiled by the app's DOM-lib `tsc`
 * pass as well as by the service worker's. Kept generic so `sw.ts` keeps Serwist's own
 * `PrecacheEntry` type through the call.
 */
type PrecacheManifestEntry = string | { url: string };

/**
 * Drops any injected precache entry that resolves under an uncacheable prefix. Serwist registers
 * its `PrecacheRoute` ahead of every `runtimeCaching` rule, so an entry that reaches the manifest
 * cannot be shadowed by a `NetworkOnly` route later — it has to be removed here.
 */
export function filterPrecacheEntries<T extends PrecacheManifestEntry>(
  entries: readonly T[] | undefined
): T[] {
  return (entries ?? []).filter(
    (entry) => !isUncacheableUrl(typeof entry === 'string' ? entry : entry.url)
  );
}
