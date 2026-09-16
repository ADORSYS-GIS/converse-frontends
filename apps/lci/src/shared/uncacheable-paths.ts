/**
 * The one list of request paths this app must never serve from any cache — the single source of
 * truth for `src/sw.ts` (see its doc comment for how each Serwist mechanism consumes it) and the
 * thing `src/proxy.test.ts` pins the matcher against.
 *
 * Every real screen in this app renders the caller's own session data server-side — the
 * repository list, run history, and approval queue are all part of the response HTML/RSC payload,
 * not fetched separately after the shell loads. So the safe set to cache is the small one: the
 * public branding/icon/manifest routes. Everything else — the root Overview page and every route
 * under `/repositories`, `/runs`, `/admin` and `/settings` — is one viewer's own data, and must
 * never be replayed to the next person who opens the same URL on a shared device, or to the same
 * person after they've signed out.
 *
 * `/auth/*` (login, callback, logout) is excluded too, for a different reason: those are
 * single-use redirect legs carrying `code`/`state` parameters and setting or clearing the session
 * cookie, and a stale cached copy would replay a spent login or swallow a `Set-Cookie`.
 *
 * `/api/*` covers the server-side control-plane proxies (`/api/repositories/[id]/graph`,
 * `.../symbols/[nodeId]/similar`) — real per-request data, authenticated against the caller's
 * own session.
 *
 * Deliberately NOT a general "is this authenticated" list stated the other way round: `/branding/*`,
 * `/icons/*` and `manifest.json` are unauthenticated too, and they are exactly the things that
 * SHOULD be cached — so the list names what to exclude, not what to allow.
 */

/**
 * Path prefixes, without a trailing slash. A path matches when it equals a prefix exactly or
 * continues with `/`, so `/runs` and `/runs/task-1` both match while `/runsomething` does not.
 */
export const UNCACHEABLE_PATH_PREFIXES = [
  '/api',
  '/auth',
  '/repositories',
  '/runs',
  '/admin',
  '/settings',
] as const;

/**
 * The prefix list as a single `RegExp`, for the Serwist options that take patterns rather than a
 * predicate (`precacheOptions.navigateFallbackDenylist`).
 */
export const UNCACHEABLE_PATH_PATTERN = new RegExp(
  `^(?:${UNCACHEABLE_PATH_PREFIXES.join('|')})(?:/|$)`
);

/**
 * The app's own root — the Overview page, server-rendered from the caller's session. Not a
 * prefix the way `/runs` is (nothing nests under it), so it gets its own exact pattern rather
 * than joining the list above, where `(?:/|$)` would otherwise turn a bare `/` into "matches
 * every path" instead of "matches only the root".
 */
export const UNCACHEABLE_ROOT_PATTERN = /^\/$/;

/**
 * Whether a URL **pathname** (no origin, no query) is one the service worker must not cache.
 */
export function isUncacheablePath(pathname: string): boolean {
  return UNCACHEABLE_ROOT_PATTERN.test(pathname) || UNCACHEABLE_PATH_PATTERN.test(pathname);
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
 * Drops any injected precache entry that resolves to an uncacheable path. Serwist registers its
 * `PrecacheRoute` ahead of every `runtimeCaching` rule, so an entry that reaches the manifest
 * cannot be shadowed by a `NetworkOnly` route later — it has to be removed here.
 */
export function filterPrecacheEntries<T extends PrecacheManifestEntry>(
  entries: readonly T[] | undefined
): T[] {
  return (entries ?? []).filter(
    (entry) => !isUncacheableUrl(typeof entry === 'string' ? entry : entry.url)
  );
}
