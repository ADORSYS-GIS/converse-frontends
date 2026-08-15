import { describe, expect, it, vi } from 'vitest';

// accounts.ts pulls in `./auth-session` → `@tanstack/react-db`/native-storage modules and
// `@lightbridge/authz-rpc` → the generated cratestack client — both drag in React Native's
// entry point transitively, which Vitest's plain Rollup/esbuild pipeline can't parse (Flow
// syntax). Mock both so this file only ever exercises the pure query-key/defaulting helpers
// under test, same spirit as the "import from the dedicated subpath" workaround documented in
// apps/self-service/src/__tests__/use-pagination.test.tsx for the Jest side.
vi.mock('./auth-session', () => ({ useAuthSession: () => ({ isAuthenticated: true }) }));
vi.mock('@lightbridge/authz-rpc', () => ({ getAuthzRpcClient: () => ({}) }));

import { accountsListQueryKey, accountsQueryKey, resolveAccountsOptions } from './accounts';

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
