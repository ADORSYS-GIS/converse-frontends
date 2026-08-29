/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

import {
  UNCACHEABLE_PATH_PATTERN,
  filterPrecacheEntries,
  isUncacheablePath,
} from './shared/uncacheable-paths';

/**
 * The console's service worker (ADR 0009 Decision 7, offline-first).
 *
 * `__SW_MANIFEST` is injected at build time with the app shell's precache entries; `defaultCache`
 * adds Next-aware runtime caching for static assets, fonts and RSC payloads.
 *
 * **`/auth/*` and `/api/*` are excluded explicitly, at every mechanism that could reach them.**
 * They used to be excluded only "by omission", which was simply untrue — `@serwist/next`'s
 * `defaultCache` ends in three same-origin catch-alls (`pages`, `others`, and a `NetworkFirst`
 * `apis` cache matching `pathname.startsWith('/api/')` on GET), so both families were being stored
 * and replayed. Its one built-in auth exemption is `/api/auth/*`, which is next-auth's layout, not
 * ours. See `./shared/uncacheable-paths.ts` for why each family is uncacheable; the three
 * mechanisms below are all of the ways a Serwist 9 instance can answer a request from a cache:
 *
 * 1. **Runtime caching.** Serwist matches routes in registration order and the first match wins, so
 *    a `NetworkOnly` route placed ahead of `defaultCache` shadows every rule in it. `NetworkOnly`
 *    never reads or writes a cache, and preserves the request's own `redirect: 'manual'` mode, so
 *    the OIDC 307/303 legs and the streaming proxies pass through untouched.
 * 2. **The precache.** `Serwist` registers its `PrecacheRoute` *before* any `runtimeCaching` entry,
 *    so a precached URL wins over rule 1 and the filter has to happen on the manifest itself. This
 *    is done here rather than through `@serwist/next`'s build-time `exclude` deliberately: that
 *    option is only consulted for webpack assets (`static/chunks/…`, which can never be under
 *    `/api` or `/auth`), while files from `public/` arrive as `additionalPrecacheEntries`, appended
 *    *after* every configured transform. Filtering the injected manifest is the only point that
 *    sees both sources.
 * 3. **The navigation fallback.** No `navigateFallback` is configured today, so no `NavigationRoute`
 *    is registered; `navigateFallbackDenylist` is set so that adding one later cannot silently
 *    re-introduce a cached shell over a login redirect.
 *
 * Screen-level offline data comes from the IndexedDB query cache instead
 * (`src/client/query-persister.ts`), which is discarded on a version bump.
 *
 * `tsc` does not type-check this file (see `tsconfig.json`'s `exclude`): a service worker needs
 * `lib: webworker`, whose `self` is irreconcilable with the `DOM` lib the rest of the app needs.
 * `@serwist/next` compiles it with its own worker-targeted pass.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: filterPrecacheEntries(self.__SW_MANIFEST),
  precacheOptions: {
    navigateFallbackDenylist: [UNCACHEABLE_PATH_PATTERN],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && isUncacheablePath(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
