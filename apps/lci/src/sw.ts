/// <reference lib="webworker" />

import { defaultCache } from '@serwist/turbopack/worker';
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

import {
  UNCACHEABLE_PATH_PATTERN,
  filterPrecacheEntries,
  isUncacheablePath,
} from './shared/uncacheable-paths';

/**
 * This app's service worker (offline caching and installability for the sidebar-shell UI).
 *
 * `__SW_MANIFEST` is injected at build time with the app shell's precache entries; `defaultCache`
 * adds Next-aware runtime caching for static assets, fonts and RSC payloads.
 *
 * `/api/*` — the OIDC redirect legs and the control-plane proxies — is excluded explicitly, at
 * every mechanism that could reach it, not by omission: `@serwist/turbopack`'s `defaultCache` ends
 * in three same-origin catch-alls (`pages`, `others`, and a `NetworkFirst` `apis` cache matching
 * `pathname.startsWith('/api/')` on GET), so without the exclusions below both a spent login leg
 * and another viewer's repository data would be stored and replayed. See
 * `./shared/uncacheable-paths.ts` for why the family is uncacheable; the three mechanisms below are
 * all of the ways a Serwist instance can answer a request from a cache:
 *
 * 1. **Runtime caching.** Serwist matches routes in registration order and the first match wins, so
 *    a `NetworkOnly` route placed ahead of `defaultCache` shadows every rule in it. `NetworkOnly`
 *    never reads or writes a cache, and preserves the request's own `redirect: 'manual'` mode, so
 *    the OIDC 307/303 legs pass through untouched.
 * 2. **The precache.** `Serwist` registers its `PrecacheRoute` *before* any `runtimeCaching` entry,
 *    so a precached URL wins over rule 1 and the filter has to happen on the manifest itself. This
 *    is done here rather than through `@serwist/turbopack`'s own manifest options (`globIgnores` /
 *    `manifestTransforms` on `createSerwistRoute`, see `src/app/serwist/[path]/route.ts`)
 *    deliberately: those are only consulted for the globbed build output (`.next/static/**` and
 *    `public/**`, which can never be under `/api`) at the point `createSerwistRoute` builds the
 *    manifest, while filtering the injected `self.__SW_MANIFEST` here is the one place that sees
 *    the manifest Serwist will actually precache, regardless of which build tool produced it.
 * 3. **The navigation fallback.** No `navigateFallback` is configured, so no `NavigationRoute` is
 *    registered; `navigateFallbackDenylist` is set so that adding one later cannot silently
 *    re-introduce a cached shell over a login redirect.
 *
 * `tsc` does not type-check this file (see `tsconfig.json`'s `exclude`): a service worker needs
 * `lib: webworker`, whose `self` is irreconcilable with the `DOM` lib the rest of the app needs.
 * `src/app/serwist/[path]/route.ts` bundles it with `esbuild-wasm` (via `@serwist/turbopack`'s
 * `createSerwistRoute`) at request time in development and at static-generation time in a
 * `next build --turbopack` build.
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
