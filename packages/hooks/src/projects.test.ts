import { beforeEach, describe, expect, it, vi } from 'vitest';

// projects.ts pulls in `./accounts` → `./auth-session` and `@lightbridge/authz-rpc` — both drag
// in React Native's entry point transitively, which Vitest's plain Rollup/esbuild pipeline can't
// parse (Flow syntax). Mock both so this file only ever exercises the pure query-key/defaulting
// helpers under test, same spirit as the "import from the dedicated subpath" workaround
// documented in apps/self-service/src/__tests__/use-pagination.test.tsx for the Jest side.
//
// `listMock` is declared via `vi.hoisted` because `vi.mock` factories are hoisted above regular
// module-level `const`s by Vitest's transform — a plain `const listMock = vi.fn()` referenced
// inside the factory below would be a temporal-dead-zone read at hoist time.
const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));
vi.mock('./auth-session', () => ({ useAuthSession: () => ({ isAuthenticated: true }) }));
vi.mock('./accounts', () => ({ useCurrentAccount: () => ({ data: undefined }) }));
vi.mock('@lightbridge/authz-rpc', () => ({
  getAuthzRpcClient: () => ({ projects: { list: listMock } }),
  createId: () => 'test-id',
}));

import {
  fetchAllProjectsForAccount,
  projectsListQueryKey,
  projectsQueryKey,
  resolveProjectsOptions,
} from './projects';

describe('resolveProjectsOptions', () => {
  it('defaults to offset 0, limit 10 when nothing is passed (unchanged existing behavior)', () => {
    expect(resolveProjectsOptions()).toEqual({ offset: 0, limit: 10 });
    expect(resolveProjectsOptions({})).toEqual({ offset: 0, limit: 10 });
  });

  it('carries through a caller-supplied offset/limit', () => {
    expect(resolveProjectsOptions({ offset: 20, limit: 25 })).toEqual({ offset: 20, limit: 25 });
  });

  it('defaults only the missing half of a partial options object', () => {
    expect(resolveProjectsOptions({ offset: 30 })).toEqual({ offset: 30, limit: 10 });
    expect(resolveProjectsOptions({ limit: 5 })).toEqual({ offset: 0, limit: 5 });
  });
});

describe('projectsListQueryKey', () => {
  const accountId = 'acc-1';

  it('appends the resolved { offset, limit } on top of the bare projectsQueryKey(accountId) prefix', () => {
    expect(projectsListQueryKey(accountId)).toEqual([
      ...projectsQueryKey(accountId),
      { offset: 0, limit: 10 },
    ]);
    expect(projectsListQueryKey(accountId, { offset: 10, limit: 10 })).toEqual([
      ...projectsQueryKey(accountId),
      { offset: 10, limit: 10 },
    ]);
  });

  it('produces a different key per page, so paged caches do not collide', () => {
    const page1 = projectsListQueryKey(accountId, { offset: 0, limit: 10 });
    const page2 = projectsListQueryKey(accountId, { offset: 10, limit: 10 });
    expect(page1).not.toEqual(page2);
  });

  it('every per-page key still starts with the bare invalidation prefix', () => {
    const key = projectsListQueryKey(accountId, { offset: 40, limit: 10 });
    expect(key.slice(0, projectsQueryKey(accountId).length)).toEqual(projectsQueryKey(accountId));
  });

  it('falls back to a stable placeholder key with no account, matching the enabled: !!accountId gate', () => {
    expect(projectsListQueryKey(undefined)).toEqual(['projects', 'unknown']);
  });
});

describe('fetchAllProjectsForAccount', () => {
  const accountId = 'acc-1';

  beforeEach(() => {
    listMock.mockReset();
  });

  it('pages past the first response and returns every project — the actual bug this hook fixes: an account with 11+ projects had its 11th+ unreachable under the old `useProjects(accountId)` call (capped at limit 10), with nothing on screen saying so', async () => {
    const page1Items = Array.from({ length: 10 }, (_, i) => ({
      id: `proj-${i + 1}`,
      name: `Project ${i + 1}`,
    }));
    const page2Items = [{ id: 'proj-11', name: 'Project 11' }];

    listMock
      .mockResolvedValueOnce({
        items: page1Items,
        totalCount: 11,
        pageInfo: { limit: 50, offset: 0, hasNextPage: true, hasPreviousPage: false },
      })
      .mockResolvedValueOnce({
        items: page2Items,
        totalCount: 11,
        pageInfo: { limit: 50, offset: 50, hasNextPage: false, hasPreviousPage: true },
      });

    const result = await fetchAllProjectsForAccount(accountId);

    expect(result.items).toHaveLength(11);
    // Project 11 — unreachable through the old capped-at-10 picker — is present.
    expect(result.items.map((project) => project.id)).toContain('proj-11');
    expect(result.totalCount).toBe(11);
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenNthCalledWith(1, {
      limit: 50,
      offset: 0,
      filters: [{ key: 'accountId', value: accountId }],
    });
    expect(listMock).toHaveBeenNthCalledWith(2, {
      limit: 50,
      offset: 50,
      filters: [{ key: 'accountId', value: accountId }],
    });
  });

  it('stops after a single page when the server reports no more', async () => {
    listMock.mockResolvedValueOnce({
      items: [{ id: 'proj-1', name: 'Project 1' }],
      totalCount: 1,
      pageInfo: { limit: 50, offset: 0, hasNextPage: false, hasPreviousPage: false },
    });

    const result = await fetchAllProjectsForAccount(accountId);

    expect(result.items).toEqual([{ id: 'proj-1', name: 'Project 1' }]);
    expect(result.totalCount).toBe(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });
});
