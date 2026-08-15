import { beforeEach, describe, expect, it, vi } from 'vitest';

// accounts.ts pulls in `./auth-session` → `@tanstack/react-db`/native-storage modules and
// `@lightbridge/authz-rpc` → the generated cratestack client — both drag in React Native's
// entry point transitively, which Vitest's plain Rollup/esbuild pipeline can't parse (Flow
// syntax). Mock both so this file only ever exercises the pure query-key/defaulting helpers
// under test, same spirit as the "import from the dedicated subpath" workaround documented in
// apps/self-service/src/__tests__/use-pagination.test.tsx for the Jest side.
//
// `listMock` is declared via `vi.hoisted` because `vi.mock` factories are hoisted above regular
// module-level `const`s by Vitest's transform — a plain `const listMock = vi.fn()` referenced
// inside the factory below would be a temporal-dead-zone read at hoist time.
const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));
vi.mock('./auth-session', () => ({ useAuthSession: () => ({ isAuthenticated: true }) }));
vi.mock('@lightbridge/authz-rpc', () => ({
  getAuthzRpcClient: () => ({ accounts: { list: listMock } }),
}));

import {
  accountsListQueryKey,
  accountsQueryKey,
  fetchAllAccounts,
  resolveAccountsOptions,
} from './accounts';

describe('resolveAccountsOptions', () => {
  it('defaults to offset 0, limit 10 when nothing is passed (unchanged existing behavior)', () => {
    expect(resolveAccountsOptions()).toEqual({ offset: 0, limit: 10 });
    expect(resolveAccountsOptions({})).toEqual({ offset: 0, limit: 10 });
  });

  it('carries through a caller-supplied offset/limit', () => {
    expect(resolveAccountsOptions({ offset: 20, limit: 25 })).toEqual({ offset: 20, limit: 25 });
  });

  it('defaults only the missing half of a partial options object', () => {
    expect(resolveAccountsOptions({ offset: 30 })).toEqual({ offset: 30, limit: 10 });
    expect(resolveAccountsOptions({ limit: 5 })).toEqual({ offset: 0, limit: 5 });
  });
});

describe('accountsListQueryKey', () => {
  it('appends the resolved { offset, limit } on top of the bare accountsQueryKey prefix', () => {
    expect(accountsListQueryKey()).toEqual([...accountsQueryKey, { offset: 0, limit: 10 }]);
    expect(accountsListQueryKey({ offset: 10, limit: 10 })).toEqual([
      ...accountsQueryKey,
      { offset: 10, limit: 10 },
    ]);
  });

  it('produces a different key per page, so paged caches do not collide', () => {
    const page1 = accountsListQueryKey({ offset: 0, limit: 10 });
    const page2 = accountsListQueryKey({ offset: 10, limit: 10 });
    expect(page1).not.toEqual(page2);
  });

  it('every per-page key still starts with the bare invalidation prefix', () => {
    const key = accountsListQueryKey({ offset: 40, limit: 10 });
    expect(key.slice(0, accountsQueryKey.length)).toEqual(accountsQueryKey);
  });
});

describe('fetchAllAccounts', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('pages past the first response and returns every item — the actual truncation bug fix: the old call sites capped at one page (limit 10) with nothing on screen saying so', async () => {
    const page1Items = Array.from({ length: 50 }, (_, i) => ({ id: `acc-${i + 1}` }));
    const page2Items = [{ id: 'acc-51' }, { id: 'acc-52' }];

    listMock
      .mockResolvedValueOnce({
        items: page1Items,
        totalCount: 52,
        pageInfo: { limit: 50, offset: 0, hasNextPage: true, hasPreviousPage: false },
      })
      .mockResolvedValueOnce({
        items: page2Items,
        totalCount: 52,
        pageInfo: { limit: 50, offset: 50, hasNextPage: false, hasPreviousPage: true },
      });

    const result = await fetchAllAccounts();

    expect(result.items).toHaveLength(52);
    // The item past the first page — unreachable before this fix — is present.
    expect(result.items.map((account) => account.id)).toContain('acc-52');
    expect(result.totalCount).toBe(52);
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenNthCalledWith(1, { limit: 50, offset: 0 });
    expect(listMock).toHaveBeenNthCalledWith(2, { limit: 50, offset: 50 });
  });

  it('stops after a single page when the server reports no more', async () => {
    listMock.mockResolvedValueOnce({
      items: [{ id: 'acc-1' }],
      totalCount: 1,
      pageInfo: { limit: 50, offset: 0, hasNextPage: false, hasPreviousPage: false },
    });

    const result = await fetchAllAccounts();

    expect(result.items).toEqual([{ id: 'acc-1' }]);
    expect(result.totalCount).toBe(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });
});
