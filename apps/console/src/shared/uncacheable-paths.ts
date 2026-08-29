/**
 * The one list of request paths the console must never serve from any cache — the single source of
 * truth for `src/sw.ts` (see its doc comment for how each Serwist mechanism consumes it) and the
 * thing `src/middleware.test.ts` pins the middleware matcher against.
 *
 * Two families, each uncacheable for its own reason:
 *
 * - **`/auth/*`** — the OIDC redirect legs (`/auth/login`, `/auth/callback`, `/auth/logout`,
 *   `/auth/signed-out`, `/auth/error`). These 307/303 to and from the IdP, carry single-use
 *   `code`/`state` parameters, and set or clear the session cookies. A cached navigation response
 *   here replays a spent login, serves the signed-out shell to a signed-in user, or swallows a
 *   `Set-Cookie` — all of which are session-corrupting, not merely stale.
 * - **`/api/*`** — the server-side proxies (`/api/rpc/*`, `/api/budget/rpc/*`, `/api/usage/*`,
 *   `/api/reports/consumption`, `/api/session`). Every one is authenticated per request against the
 *   caller's own session, and some stream. A cache is origin-scoped and shared across sessions, so
 *   a stored response outlives the session that authorised it.
 *
 * Deliberately NOT a general "is this public" list: `/_next/*`, `/icons/*` and `manifest.json` are
 * unauthenticated too, and they are exactly the things that SHOULD be cached.
 */

/**
 * Path prefixes, without a trailing slash. A path matches when it equals a prefix exactly or
 * continues with `/`, so `/api` and `/api/rpc/x` both match while `/apikeys` does not.
 */
export const UNCACHEABLE_PATH_PREFIXES = ['/api', '/auth'] as const;

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
    return isUncacheablePath(new URL(url, 'https://console.invalid').pathname);
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
