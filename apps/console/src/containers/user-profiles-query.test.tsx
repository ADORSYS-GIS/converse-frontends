import type {
  LightbridgeAuthzRpcClient,
  UserProfiles,
  UserSearchResults,
} from '@lightbridge/authz-rpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  USER_PROFILES_QUERY_KEY,
  USER_SEARCH_QUERY_KEY,
  userProfilesQuery,
  userSearchQuery,
} from './user-profiles-query';

/**
 * The production incident this file exists for (2026-09-03, `sha-5f6d90f`).
 *
 * `use-admin-roles-screen.ts`, `use-admin-sessions-screen.ts` and `use-refills-queue-screen.ts`
 * each declared their own `['authz', 'resolveUserProfiles']` key prefix over the same variable
 * part (a sorted, de-duplicated id list) — ONE TanStack cache entry — but disagreed on what they
 * stored under it: two cached the unwrapped `UserProfile[]`, the third cached the RPC envelope
 * `{ profiles: [...] }`. The console shell mounts `useRefillsQueueScreen()` on EVERY page, and a
 * disabled `useQuery` still reads whatever already sits under its key, so once `/admin/roles`
 * wrote the envelope the shell threw `TypeError: …data.map is not a function` on every route.
 *
 * Per-hook unit tests could not see it: each built its OWN `QueryClient`, so the entry the bug
 * lives in was never shared. These tests share one.
 */

const resolveUserProfiles = vi.fn();
const searchUsers = vi.fn();

const client = {
  procedures: { resolveUserProfiles, searchUsers },
} as unknown as LightbridgeAuthzRpcClient;

const PROFILES: UserProfiles = {
  profiles: [
    {
      userId: 'usr_a',
      displayName: 'Maria Okonkwo',
      email: 'maria@brightline.dev',
      username: null,
    },
    { userId: 'usr_b', displayName: 'tobias.lang', email: null, username: null },
  ],
};

const SEARCH: UserSearchResults = {
  users: [{ userId: 'usr_a', displayName: 'Maria Okonkwo', email: null, username: null }],
};

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('userProfilesQuery / userSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserProfiles.mockResolvedValue(PROFILES);
    searchUsers.mockResolvedValue(SEARCH);
  });

  it('unwraps the envelope, so what lands in the cache is always an array', async () => {
    // Fed the REAL generated wire type, not a hand-shaped literal: `PROFILES` is annotated
    // `UserProfiles`, so a schema change that moves `profiles` fails this file under `tsc` first.
    const rows = await userProfilesQuery(client, ['usr_a', 'usr_b']).queryFn();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.map((profile) => profile.userId)).toEqual(['usr_a', 'usr_b']);

    const matches = await userSearchQuery(client, 'mar', 20).queryFn();
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.map((profile) => profile.userId)).toEqual(['usr_a']);
  });

  it('gives the same id list the same key regardless of caller — one entry, one shape', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ids = ['usr_a', 'usr_b'];

    // Two independent callers (the roles screen and the shell's refills queue), one cache.
    const roles = userProfilesQuery(client, ids);
    const queue = userProfilesQuery(client, ids);
    expect(queue.queryKey).toEqual(roles.queryKey);

    await queryClient.fetchQuery(roles);
    // What the OTHER caller now reads back — the exact expression that threw in production.
    const shared = queryClient.getQueryData<Awaited<ReturnType<typeof queue.queryFn>>>(
      queue.queryKey
    );
    expect(Array.isArray(shared)).toBe(true);
    expect(() => new Map((shared ?? []).map((profile) => [profile.userId, profile]))).not.toThrow();

    // One entry, one network call — the batching property the key was designed for still holds.
    expect(resolveUserProfiles).toHaveBeenCalledTimes(1);
  });

  it('does not collide an omitted search limit with an explicit one', () => {
    expect(userSearchQuery(client, 'mar').queryKey).not.toEqual(
      userSearchQuery(client, 'mar', 20).queryKey
    );
  });

  it('keys are rooted where the invalidators expect them', () => {
    expect(userProfilesQuery(client, ['usr_a']).queryKey.slice(0, 2)).toEqual([
      ...USER_PROFILES_QUERY_KEY,
    ]);
    expect(userSearchQuery(client, 'mar').queryKey.slice(0, 2)).toEqual([...USER_SEARCH_QUERY_KEY]);
  });

  it('renders a consumer of the shared entry without throwing', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ids = ['usr_a', 'usr_b'];
    await queryClient.fetchQuery(userProfilesQuery(client, ids));

    const { result } = renderHook(
      () => {
        const data = queryClient.getQueryData<
          Awaited<ReturnType<ReturnType<typeof userProfilesQuery>['queryFn']>>
        >(userProfilesQuery(client, ids).queryKey);
        return data ? new Map(data.map((profile) => [profile.userId, profile])) : undefined;
      },
      { wrapper: wrapper(queryClient) }
    );

    await waitFor(() => expect(result.current?.size).toBe(2));
  });
});

/**
 * The drift guard. `user-profiles-query.ts` is only a single source of truth for as long as it is
 * the ONLY place these two op-ids appear in a query key — the incident was created by a second
 * declaration, not by a bad payload, so what has to be prevented is the second declaration.
 */
describe('no hand-written identity query keys outside the helper', () => {
  // The whole client tree, not just `containers/` — a second declaration is just as fatal from
  // `client/` or `dashboards/`, and the incident's third declaration was one directory away from
  // the other two.
  const SOURCE_ROOT = join(__dirname, '..');
  const OP_IDS = ['resolveUserProfiles', 'searchUsers'];

  function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  it('only user-profiles-query.ts puts these op-ids in a queryKey array', () => {
    const offenders = sourceFiles(SOURCE_ROOT)
      .filter(
        (path) =>
          !path.endsWith('user-profiles-query.ts') && !path.endsWith('user-profiles-query.test.tsx')
      )
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        // A key literal, not a call: `['authz', 'resolveUserProfiles']`. `client.procedures.
        // resolveUserProfiles(...)` inside the helper's own queryFn is the legitimate use.
        return OP_IDS.some((opId) => new RegExp(`'authz',\\s*'${opId}'`).test(source));
      });

    expect(offenders).toEqual([]);
  });
});
