import { describe, expect, it, vi } from 'vitest';

// projects.ts pulls in `./accounts` → `./auth-session` and `@lightbridge/authz-rpc` — both drag
// in React Native's entry point transitively, which Vitest's plain Rollup/esbuild pipeline can't
// parse (Flow syntax). Mock both so this file only ever exercises the pure query-key/defaulting
// helpers under test, same spirit as the "import from the dedicated subpath" workaround
// documented in apps/self-service/src/__tests__/use-pagination.test.tsx for the Jest side.
vi.mock('./auth-session', () => ({ useAuthSession: () => ({ isAuthenticated: true }) }));
vi.mock('./accounts', () => ({ useCurrentAccount: () => ({ data: undefined }) }));
vi.mock('@lightbridge/authz-rpc', () => ({
  getAuthzRpcClient: () => ({}),
  createId: () => 'test-id',
}));
vi.mock('@lightbridge/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { projectsListQueryKey, projectsQueryKey, resolveProjectsOptions } from './projects';

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
