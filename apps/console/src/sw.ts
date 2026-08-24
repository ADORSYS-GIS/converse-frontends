/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

/**
 * The console's service worker (ADR 0009 Decision 7, offline-first).
 *
 * `__SW_MANIFEST` is injected at build time with the app shell's precache entries; `defaultCache`
 * adds Next-aware runtime caching for static assets, fonts and RSC payloads.
 *
 * Nothing under `/api/*` or `/auth/*` is cached, by omission: `defaultCache` matches static assets
 * and navigations, and every proxy response is already `Cache-Control: no-store`. Caching an
 * authenticated RPC response into a shared, origin-scoped store would outlive the session that
 * authorised it. Screen-level offline data comes from the IndexedDB query cache instead
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
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
