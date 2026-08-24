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
 * Cache buster. Keyed on the app version so a deploy that changes a payload shape discards the
 * previous cache instead of rehydrating objects the new code cannot read.
 */
export const QUERY_CACHE_BUSTER = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
