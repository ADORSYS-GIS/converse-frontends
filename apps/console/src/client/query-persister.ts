'use client';

import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

/**
 * IndexedDB persistence for refine's TanStack Query cache (ADR 0009 Decision 7, offline-first):
 * a screen you have already loaded renders from cache when the network is gone, with an inline
 * "offline · showing cached data" status line rather than an empty state.
 *
 * IndexedDB rather than `localStorage` because the cache holds structured objects and can be
 * megabytes; `localStorage` is synchronous, string-only and ~5MB.
 *
 * Note what is NOT persisted: nothing here touches auth. Tokens live in the httpOnly cookie and
 * never enter the query cache, so this store holds only the same account/project/api-key data the
 * screen was already displaying.
 */
const CACHE_KEY = 'lightbridge-console-query-cache';

export function createIndexedDbPersister(key: string = CACHE_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(key, client);
    },
    restoreClient: async () => get<PersistedClient>(key),
    removeClient: async () => {
      await del(key);
    },
  };
}

/** A day: long enough to survive a flight, short enough that stale spend figures expire. */
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Cache buster: a deploy that changes a payload shape must DISCARD the previous cache rather than
 * rehydrate objects the new code cannot read.
 *
 * Keyed on the build SHA, not the app version. `NEXT_PUBLIC_APP_VERSION` is
 * `apps/console/package.json`'s `version`, which is `0.0.0` and has never moved — so the buster it
 * produced was one frozen string for the entire life of the app, and the "discards the previous
 * cache" property this constant exists for was never actually true in production. That is what
 * turned the 2026-09-03 `resolveUserProfiles` shape collision (see
 * `containers/user-profiles-query.ts`) from a transient mismatch into a sticky, 24-hour,
 * every-page crash: the poisoned entry outlived every deploy that could have cleared it.
 *
 * `NEXT_PUBLIC_BUILD_SHA` is inlined by `next build` and set per build in CI
 * (`.github/workflows/docker-image.yml`), so it changes on every deploy — which is exactly the
 * granularity a shape change needs. The version stays as the fallback for a local `next build`
 * that sets no SHA, and `'dev'` for `next dev`.
 */
export const QUERY_CACHE_BUSTER =
  process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
