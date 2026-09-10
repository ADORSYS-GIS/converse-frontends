'use client';

import type { LightbridgeAuthzRpcClient, UserProfile } from '@lightbridge/authz-rpc';

/**
 * The ONE definition of every `resolveUserProfiles` / `searchUsers` cache entry in the console.
 *
 * ## Why this module exists (converse-frontends production incident, 2026-09-03)
 *
 * Three hooks resolved user identities independently — `use-refills-queue-screen.ts`,
 * `use-admin-sessions-screen.ts` and `use-admin-roles-screen.ts` — and each declared its own
 * `['authz', 'resolveUserProfiles']` key prefix with the same variable part (the SORTED,
 * de-duplicated id list). Same key, therefore **one shared TanStack cache entry**. But two of them
 * unwrapped the RPC envelope in their `queryFn` (`(await …).profiles`, an array) and the third
 * cached the envelope itself (`{ profiles: [...] }`). Whichever hook populated the entry first
 * decided the shape every other hook read back.
 *
 * The console shell mounts `useRefillsQueueScreen()` on EVERY page (`console-chrome.tsx`'s refill
 * badge), and a disabled `useQuery` still reads whatever is already under its key — so once a
 * visit to `/admin/roles` wrote the envelope under an id list the queue also uses, the shell's
 * `requesterQuery.data.map(...)` threw `TypeError: … .data.map is not a function` on every route
 * until the cache expired. Unit tests never saw it: each hook was tested with its own
 * `QueryClient`, so the entry was never shared.
 *
 * The fix is structural, not per-site: a key and its payload are declared together, once. Every
 * caller goes through {@link userProfilesQuery} / {@link userSearchQuery}, so a key can only ever
 * map to `UserProfile[]`. Do not hand-write an `['authz', 'resolveUserProfiles', …]` key anywhere
 * else — `user-profiles-query.test.ts` fails the build if you do.
 */

/** Key root for the batch identity lookup. Exported for `invalidateQueries` and for the test that
 *  asserts nothing else in `src/` writes this prefix by hand. */
export const USER_PROFILES_QUERY_KEY = ['authz', 'resolveUserProfiles'] as const;

/** Key root for the person picker's directory search. */
export const USER_SEARCH_QUERY_KEY = ['authz', 'searchUsers'] as const;

/**
 * One batch identity lookup, as TanStack Query options.
 *
 * The variable part of the key is the caller's id list, which every caller builds SORTED and
 * de-duplicated (`requesterIdsOf`, `subjectUserIdsOf`, `grantIdentityIdsOf`) — that is what makes
 * this one query per page rather than one per row: two renders of the same page produce the same
 * key and the second is served from cache. Sorting matters — `['b','a']` and `['a','b']` are the
 * same request but two different cache entries otherwise.
 *
 * `queryFn` unwraps the envelope, so the cached value is always `UserProfile[]`.
 */
export function userProfilesQuery(
  client: LightbridgeAuthzRpcClient,
  userIds: readonly string[]
): {
  queryKey: readonly unknown[];
  queryFn: () => Promise<UserProfile[]>;
} {
  return {
    queryKey: [...USER_PROFILES_QUERY_KEY, userIds],
    queryFn: async () => {
      const result = await client.procedures.resolveUserProfiles({
        args: { userIds: [...userIds] },
      });
      return result.profiles;
    },
  };
}

/**
 * One directory search, as TanStack Query options. Same contract as {@link userProfilesQuery}: the
 * cached value is `UserProfile[]`, never the `{ users }` envelope.
 *
 * `limit` is always part of the key — `null` when the caller takes the backend's own default —
 * because the same term at two limits is two different answers, and an omitted limit must not
 * collide with an explicit one.
 */
export function userSearchQuery(
  client: LightbridgeAuthzRpcClient,
  query: string,
  limit?: number
): {
  queryKey: readonly unknown[];
  queryFn: () => Promise<UserProfile[]>;
} {
  return {
    queryKey: [...USER_SEARCH_QUERY_KEY, query, limit ?? null],
    queryFn: async () => {
      const result = await client.procedures.searchUsers({
        args: limit === undefined ? { query } : { query, limit },
      });
      return result.users;
    },
  };
}
