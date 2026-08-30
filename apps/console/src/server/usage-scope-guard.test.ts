import { describe, expect, it } from 'vitest';

import {
  guardUsageScope,
  isScopeOwned,
  parseUsageScopeRequest,
  type ResolveOwnedAccountIds,
  type ResolveProjectAccountId,
} from './usage-scope-guard';

/**
 * P1 security fix (IA v3 phase 1) — see `usage-scope-guard.ts`'s own module doc comment for the
 * vulnerability this guard closes: before it existed, `proxyRequest` forwarded ANY signed-in
 * caller's `{scope, scope_id}` verbatim to the usage backend, letting one account read another
 * account's spend by editing the request body.
 *
 * Covers the pure predicate/parser directly, and the composed `guardUsageScope` with
 * hand-written resolver fakes (never a mocked network call) for the four scenarios the ticket
 * names: an owned account passes, a foreign account 403s, a project scope requires resolvable
 * ownership, and a malformed body 400s — plus the fail-closed edges each of those implies.
 */

describe('parseUsageScopeRequest', () => {
  it('parses a well-formed {scope, scope_id} body', () => {
    expect(parseUsageScopeRequest({ scope: 'account', scope_id: 'acct_1' })).toEqual({
      scope: 'account',
      scopeId: 'acct_1',
    });
  });

  it('ignores every other field on the body — only scope/scope_id matter here', () => {
    expect(
      parseUsageScopeRequest({
        scope: 'project',
        scope_id: 'proj_1',
        start_time: '2026-01-01T00:00:00Z',
        end_time: '2026-01-31T00:00:00Z',
        filters: { model: 'gpt' },
      })
    ).toEqual({ scope: 'project', scopeId: 'proj_1' });
  });

  it.each([
    ['not an object', null],
    ['an array', ['account', 'acct_1']],
    ['a string', 'account'],
    ['missing scope', { scope_id: 'acct_1' }],
    ['missing scope_id', { scope: 'account' }],
    ['empty scope', { scope: '', scope_id: 'acct_1' }],
    ['empty scope_id', { scope: 'account', scope_id: '' }],
    ['non-string scope', { scope: 1, scope_id: 'acct_1' }],
    ['non-string scope_id', { scope: 'account', scope_id: 1 }],
  ])('rejects a malformed body: %s', (_label, body) => {
    expect(parseUsageScopeRequest(body)).toBeNull();
  });
});

describe('isScopeOwned', () => {
  const owned = new Set(['acct_1', 'acct_2']);

  it('an owned account scope passes', () => {
    expect(isScopeOwned('account', 'acct_1', owned, undefined)).toBe(true);
  });

  it('a foreign account scope is rejected', () => {
    expect(isScopeOwned('account', 'acct_foreign', owned, undefined)).toBe(false);
  });

  it('a project scope resolving to an owned account passes', () => {
    expect(isScopeOwned('project', 'proj_1', owned, 'acct_1')).toBe(true);
  });

  it('a project scope resolving to a foreign account is rejected', () => {
    expect(isScopeOwned('project', 'proj_1', owned, 'acct_foreign')).toBe(false);
  });

  it('a project scope whose account could not be resolved fails closed', () => {
    expect(isScopeOwned('project', 'proj_1', owned, null)).toBe(false);
    expect(isScopeOwned('project', 'proj_1', owned, undefined)).toBe(false);
  });

  it('an empty owned set rejects every account scope', () => {
    expect(isScopeOwned('account', 'acct_1', new Set(), undefined)).toBe(false);
  });

  it('an unrecognised scope kind fails closed even for a real owned id', () => {
    expect(isScopeOwned('user', 'acct_1', owned, undefined)).toBe(false);
    expect(isScopeOwned('api_key', 'key_1', owned, undefined)).toBe(false);
    expect(isScopeOwned('bogus', 'acct_1', owned, undefined)).toBe(false);
  });
});

describe('guardUsageScope', () => {
  function resolvers(
    owned: ReadonlySet<string> | null,
    projectAccount: Record<string, string | null> = {}
  ): [ResolveOwnedAccountIds, ResolveProjectAccountId] {
    return [
      async () => owned,
      async (projectId: string) => projectAccount[projectId] ?? null,
    ];
  }

  it('an owned account scope passes', async () => {
    const [resolveOwned, resolveProject] = resolvers(new Set(['acct_1']));
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'acct_1' },
      resolveOwned,
      resolveProject
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('a foreign account scope 403s', async () => {
    const [resolveOwned, resolveProject] = resolvers(new Set(['acct_1']));
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'acct_foreign' },
      resolveOwned,
      resolveProject
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('a project scope requires resolvable ownership — resolves to an owned account, passes', async () => {
    const [resolveOwned, resolveProject] = resolvers(new Set(['acct_1']), { proj_1: 'acct_1' });
    const outcome = await guardUsageScope(
      { scope: 'project', scope_id: 'proj_1' },
      resolveOwned,
      resolveProject
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('a project scope requires resolvable ownership — resolves to a foreign account, 403s', async () => {
    const [resolveOwned, resolveProject] = resolvers(new Set(['acct_1']), {
      proj_1: 'acct_foreign',
    });
    const outcome = await guardUsageScope(
      { scope: 'project', scope_id: 'proj_1' },
      resolveOwned,
      resolveProject
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('a project scope requires resolvable ownership — unresolvable project 403s (fails closed)', async () => {
    const [resolveOwned, resolveProject] = resolvers(new Set(['acct_1']), {});
    const outcome = await guardUsageScope(
      { scope: 'project', scope_id: 'proj_missing' },
      resolveOwned,
      resolveProject
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('a malformed body 400s before either resolver is even called', async () => {
    let ownedCalled = false;
    let projectCalled = false;
    const outcome = await guardUsageScope(
      { scope: 'account' },
      async () => {
        ownedCalled = true;
        return new Set(['acct_1']);
      },
      async () => {
        projectCalled = true;
        return null;
      }
    );
    expect(outcome).toEqual({ ok: false, status: 400, error: 'invalid_body' });
    expect(ownedCalled).toBe(false);
    expect(projectCalled).toBe(false);
  });

  it('fails closed when the owned-accounts resolution itself fails (null, not empty)', async () => {
    const [resolveOwned, resolveProject] = resolvers(null);
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'acct_1' },
      resolveOwned,
      resolveProject
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });
});

// ── The sub fast-path (2026-08-30): own home account approves from the session alone ──────────
describe('home-account fast path', () => {
  const neverResolve = () => {
    throw new Error('resolver must not be called on the fast path');
  };

  it('approves scope=account for the caller own home account without any resolver call', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'home-1' },
      neverResolve as never,
      neverResolve as never,
      'home-1'
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('falls through to the resolvers for a child account id', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'child-9' },
      async () => new Set(['home-1', 'child-9']),
      async () => null,
      'home-1'
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('never fast-paths a project scope, even for an id equal to the home account', async () => {
    let resolved = false;
    await guardUsageScope(
      { scope: 'project', scope_id: 'home-1' },
      async () => {
        resolved = true;
        return new Set(['home-1']);
      },
      async () => 'home-1',
      'home-1'
    );
    expect(resolved).toBe(true);
  });

  it('still refuses a foreign account when the fast path does not match', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'foreign-2' },
      async () => new Set(['home-1']),
      async () => null,
      'home-1'
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });
});
