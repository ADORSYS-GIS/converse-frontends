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

  // `scope: 'all'` (lightbridge-authz#605) is the one scope kind whose `scope_id` is
  // required-but-IGNORED on the wire — an empty string is the documented, expected shape, not a
  // malformed body.
  it('accepts an empty scope_id for scope=all — the documented ignored shape', () => {
    expect(parseUsageScopeRequest({ scope: 'all', scope_id: '' })).toEqual({
      scope: 'all',
      scopeId: '',
    });
  });

  it('still requires scope_id to be a string for scope=all, even though its value is ignored', () => {
    expect(parseUsageScopeRequest({ scope: 'all' })).toBeNull();
    expect(parseUsageScopeRequest({ scope: 'all', scope_id: 1 })).toBeNull();
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

  // `'all'` (lightbridge-authz#605) has no per-account ownership predicate at all, by
  // definition — the pure predicate has no arm for it and falls through to the same fail-closed
  // default as `'user'`/`'api_key'`. Only `guardUsageScope`'s own admin fast path (tested below)
  // ever allows it.
  it('scope=all fails closed here too — only the admin fast path in guardUsageScope allows it', () => {
    expect(isScopeOwned('all', '', owned, undefined)).toBe(false);
  });
});

describe('guardUsageScope', () => {
  function resolvers(
    owned: ReadonlySet<string> | null,
    projectAccount: Record<string, string | null> = {}
  ): [ResolveOwnedAccountIds, ResolveProjectAccountId] {
    return [async () => owned, async (projectId: string) => projectAccount[projectId] ?? null];
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

// ── Admin fast path (converse-frontends#368, owner review finding: "/admin/overview is overview
// for ALL account, not just the one the user is bound to. ALL of them.") — the operator-role
// bypass this widening added to close the gap between what `/admin/overview`'s fan-out can
// legitimately DISCOVER (family + refill-queue account ids, `estateAccountIds`) and what this
// guard would actually let it QUERY. Every case here also asserts the resolver is never called
// on the admin path, and that the non-admin path is untouched by `canReadAllUsage`'s mere presence. ────
describe('admin fast path', () => {
  const neverResolve = () => {
    throw new Error('resolver must not be called on the admin fast path');
  };

  it('an admin session queries an account scope_id outside its own family without any resolver call', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'acct-not-in-any-owned-set' },
      neverResolve as never,
      neverResolve as never,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('canReadAllUsage: false behaves exactly like the pre-existing signature — resolver still runs, foreign scope still 403s', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'acct-foreign' },
      async () => new Set(['acct-owned']),
      async () => null,
      undefined,
      false
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('canReadAllUsage omitted (undefined) is treated as non-admin — the existing five-arg call sites are unaffected', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'acct-foreign' },
      async () => new Set(['acct-owned']),
      async () => null
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  // ── #448: the fast path now covers `user` and `project` too, mirroring the backend's own
  // `usage:read-all` rule (lightbridge-authz PR #652). These are the two `/admin/usage` needs:
  // its actor lens queries `scope: user` for a subject that is NOT the operator's own, and its
  // project lens queries a project outside the operator's family. Both are strictly narrower than
  // the `scope: all` this same session is already entitled to.
  it('an admin session queries a user scope_id that is not its own subject, without any resolver call', async () => {
    const outcome = await guardUsageScope(
      { scope: 'user', scope_id: 'user-someone-else' },
      neverResolve as never,
      neverResolve as never,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('an admin session queries a project outside its own family, without any resolver call', async () => {
    const outcome = await guardUsageScope(
      { scope: 'project', scope_id: 'proj-foreign' },
      neverResolve as never,
      neverResolve as never,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('a NON-admin user scope still fails closed — the widening is the role, not the scope', async () => {
    const outcome = await guardUsageScope(
      { scope: 'user', scope_id: 'user-someone-else' },
      async () => new Set(['acct-owned']),
      async () => null,
      undefined,
      false
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('a NON-admin project scope still resolves real ownership and 403s on a foreign project', async () => {
    let resolverCalled = false;
    const outcome = await guardUsageScope(
      { scope: 'project', scope_id: 'proj-foreign' },
      async () => new Set(['acct-owned']),
      async (projectId) => {
        resolverCalled = true;
        expect(projectId).toBe('proj-foreign');
        return 'acct-foreign';
      },
      undefined,
      false
    );
    expect(resolverCalled).toBe(true);
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  // `api_key` is the one scope the backend refuses for EVERY caller — it has no resolvable
  // ownership authority at all — so passing it here would only buy a guard pass followed by a
  // backend 403. Admin is not an exception, and this pins that.
  it('does NOT bypass api_key even for an admin — the backend refuses that scope unconditionally', async () => {
    const outcome = await guardUsageScope(
      { scope: 'api_key', scope_id: 'key-1' },
      async () => new Set(['acct-owned']),
      async () => null,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('an admin body still 400s on a malformed request, before canReadAllUsage is ever consulted', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account' },
      neverResolve as never,
      neverResolve as never,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: false, status: 400, error: 'invalid_body' });
  });

  it('the home-account fast path and the admin fast path agree — either alone is sufficient', async () => {
    const outcome = await guardUsageScope(
      { scope: 'account', scope_id: 'home-1' },
      neverResolve as never,
      neverResolve as never,
      'home-1',
      true
    );
    expect(outcome).toEqual({ ok: true });
  });
});

// ── scope=all admin fast path (lightbridge-authz#605, the `/admin/overview` estate data path) —
// an admin session's estate-wide usage query (`scope: 'all', scope_id: ''`) is approved from the
// role check alone, mirroring the `scope: 'account'` admin fast path above; a non-admin session
// gets the pre-existing generic fail-closed behavior, unchanged. The backend independently
// enforces `usage:read-all` too (lightbridge-authz#605) — this guard is defense-in-depth for this
// scope, not the sole gate. ──────────────────────────────────────────────────────────────────
describe('admin scope=all fast path', () => {
  const neverResolve = () => {
    throw new Error('resolver must not be called on the scope=all admin fast path');
  };

  it('an admin session queries scope=all with an empty scope_id without any resolver call', async () => {
    const outcome = await guardUsageScope(
      { scope: 'all', scope_id: '' },
      neverResolve as never,
      neverResolve as never,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: true });
  });

  it('a non-admin scope=all request 403s — the generic fallthrough, resolver still runs', async () => {
    let resolverCalled = false;
    const outcome = await guardUsageScope(
      { scope: 'all', scope_id: '' },
      async () => {
        resolverCalled = true;
        return new Set(['acct-owned']);
      },
      async () => null,
      undefined,
      false
    );
    expect(resolverCalled).toBe(true);
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('canReadAllUsage omitted (undefined) refuses scope=all — the existing five-arg call sites are unaffected', async () => {
    const outcome = await guardUsageScope(
      { scope: 'all', scope_id: '' },
      async () => new Set(['acct-owned']),
      async () => null
    );
    expect(outcome).toEqual({ ok: false, status: 403, error: 'scope_not_owned' });
  });

  it('an admin body still 400s on a malformed scope=all request (non-string scope_id)', async () => {
    const outcome = await guardUsageScope(
      { scope: 'all', scope_id: 1 },
      neverResolve as never,
      neverResolve as never,
      undefined,
      true
    );
    expect(outcome).toEqual({ ok: false, status: 400, error: 'invalid_body' });
  });
});
