import { describe, expect, it } from 'vitest';

import { ALL_PERMISSIONS, expandGrant, permissionsForRoles } from './rbac';

// Ported from lightbridge-authz's crates/lightbridge-authz-core/src/authz.rs test module,
// so the client-side mirror is checked against the same cases as the server it mirrors.

describe('expandGrant', () => {
  it('wildcard expands to every permission', () => {
    expect(expandGrant('*')).toHaveLength(ALL_PERMISSIONS.length);
  });

  it("resource wildcard expands to that resource's actions", () => {
    const project = expandGrant('project:*');
    expect(project).toHaveLength(6);
    expect(project).toContain('project:create');
    expect(project).toContain('project:delete');
    expect(project).toContain('project:disable');
    // Roster management is a project capability since lightbridge-authz ADR-0006 — it used to be
    // `account:member`, so `project:*` did not confer it before.
    expect(project).toContain('project:member');
    expect(project).not.toContain('account:create');
  });

  it('no longer expands account:* to a membership capability', () => {
    const account = expandGrant('account:*');
    expect(account).not.toContain('account:member');
    expect(account).not.toContain('project:member');
  });

  it('exact grant expands to a single permission', () => {
    expect(expandGrant('account:delete')).toEqual(['account:delete']);
  });

  it('unknown grant expands to nothing', () => {
    expect(expandGrant('account:teleport')).toEqual([]);
    expect(expandGrant('nonsense')).toEqual([]);
    expect(expandGrant('   ')).toEqual([]);
  });
});

describe('budget:*/session:* permissions (issue #147, lightbridge-authz#325)', () => {
  // The backend's Permission::ALL declares these eleven budget permissions immediately after the
  // apikey:* group, in this exact order (budget:read-own added by lightbridge-authz#325, right
  // after budget:read). Asserted as a literal array (not just "contains") so any accidental
  // reorder/alphabetization fails loudly.
  const BUDGET_PERMISSIONS_IN_ORDER = [
    'budget:read',
    'budget:read-own',
    'budget:self-refill',
    'budget:review',
    'budget:grant',
    'budget:revoke',
    'budget:audit-read',
    'budget:policy-read',
    'budget:policy-write',
    'budget:policy-simulate',
    'budget:policy-activate',
  ] as const;

  // Declared immediately after the budget:* group, at the very end of Permission::ALL
  // (lightbridge-authz#325).
  const SESSION_PERMISSIONS_IN_ORDER = ['session:revoke-own', 'session:revoke'] as const;

  it('ALL_PERMISSIONS has exactly 31 entries: the original 18, plus the eleven budget:* additions, plus the two session:* additions', () => {
    expect(ALL_PERMISSIONS).toHaveLength(31);
  });

  it('all eleven budget permissions are present, in the backend declaration order, immediately after apikey:*', () => {
    const lastApikeyIndex = ALL_PERMISSIONS.lastIndexOf('apikey:validate');
    const budgetSlice = ALL_PERMISSIONS.slice(
      lastApikeyIndex + 1,
      lastApikeyIndex + 1 + BUDGET_PERMISSIONS_IN_ORDER.length
    );
    expect(budgetSlice).toEqual(BUDGET_PERMISSIONS_IN_ORDER);
  });

  it('both session permissions are present, in the backend declaration order, as the final two entries', () => {
    const sessionSlice = ALL_PERMISSIONS.slice(-SESSION_PERMISSIONS_IN_ORDER.length);
    expect(sessionSlice).toEqual(SESSION_PERMISSIONS_IN_ORDER);
  });

  it('every budget/session permission appears in ALL_PERMISSIONS in relative order', () => {
    const indices = [...BUDGET_PERMISSIONS_IN_ORDER, ...SESSION_PERMISSIONS_IN_ORDER].map(
      (permission) => ALL_PERMISSIONS.indexOf(permission)
    );
    expect(indices.every((index) => index !== -1)).toBe(true);
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it('`*` expands to include every budget/session permission, including the hyphenated ones', () => {
    const all = expandGrant('*');
    for (const permission of [...BUDGET_PERMISSIONS_IN_ORDER, ...SESSION_PERMISSIONS_IN_ORDER]) {
      expect(all).toContain(permission);
    }
  });

  it('`budget:*` expands to exactly the eleven budget permissions and nothing else', () => {
    const budget = expandGrant('budget:*');
    expect(budget).toHaveLength(11);
    expect(budget).toEqual(BUDGET_PERMISSIONS_IN_ORDER);
    expect(budget).not.toContain('apikey:validate');
    expect(budget).not.toContain('account:create');
    expect(budget).not.toContain('session:revoke-own');
  });

  it('`session:*` expands to exactly the two session permissions and nothing else', () => {
    const session = expandGrant('session:*');
    expect(session).toHaveLength(2);
    expect(session).toEqual(SESSION_PERMISSIONS_IN_ORDER);
    expect(session).not.toContain('budget:self-refill');
  });

  it('resourceOf-driven expansion is not fooled by the hyphen or extra segment in the action', () => {
    // budget:audit-read, budget:policy-simulate, budget:read-own, and session:revoke-own each
    // contain a hyphen AND, textually, an internal '-' that must NOT be mistaken for a second ':'
    // resource separator. Confirm they land under their real resource, not e.g. a phantom
    // `budget:audit`/`budget:policy`/`budget:read`/`session:revoke`.
    const budget = expandGrant('budget:*');
    expect(budget).toContain('budget:audit-read');
    expect(budget).toContain('budget:policy-simulate');
    expect(budget).toContain('budget:read-own');
    const session = expandGrant('session:*');
    expect(session).toContain('session:revoke-own');
    // And exact-match grants for the hyphenated permissions resolve to themselves only.
    expect(expandGrant('budget:audit-read')).toEqual(['budget:audit-read']);
    expect(expandGrant('budget:policy-simulate')).toEqual(['budget:policy-simulate']);
    expect(expandGrant('budget:self-refill')).toEqual(['budget:self-refill']);
    expect(expandGrant('budget:read-own')).toEqual(['budget:read-own']);
    expect(expandGrant('session:revoke-own')).toEqual(['session:revoke-own']);
    // `budget:read` is a distinct, non-hyphenated exact grant -- it must NOT pull in the
    // hyphenated `budget:read-own` permission just because it's a string prefix.
    expect(expandGrant('budget:read')).toEqual(['budget:read']);
    // Same for the admin `session:revoke` vs the self-service `session:revoke-own`.
    expect(expandGrant('session:revoke')).toEqual(['session:revoke']);
  });

  it('a near-miss grant string does not accidentally match a hyphenated permission', () => {
    // Guards against a naive implementation that might split on '-' as well as ':'.
    expect(expandGrant('budget:audit')).toEqual([]);
    expect(expandGrant('budget:policy')).toEqual([]);
    expect(expandGrant('budget:self')).toEqual([]);
    expect(expandGrant('budget:read-own-extra')).toEqual([]);
  });

  it('lightbridge-admin (bare "*") now also carries every budget/session permission', () => {
    const admin = permissionsForRoles(['lightbridge-admin']);
    for (const permission of [...BUDGET_PERMISSIONS_IN_ORDER, ...SESSION_PERMISSIONS_IN_ORDER]) {
      expect(admin.has(permission)).toBe(true);
    }
    expect(admin.size).toBe(ALL_PERMISSIONS.length);
  });

  it('lightbridge-editor carries budget:self-refill/budget:read-own/session:revoke-own but no other budget:*/session:* grant (lightbridge-authz#325, resolves #294)', () => {
    const editor = permissionsForRoles(['lightbridge-editor']);
    expect(editor.has('budget:self-refill')).toBe(true);
    expect(editor.has('budget:read-own')).toBe(true);
    expect(editor.has('session:revoke-own')).toBe(true);
    const adminOnlyGrants: readonly string[] = [
      'budget:read',
      'budget:review',
      'budget:grant',
      'budget:revoke',
      'budget:audit-read',
      'budget:policy-read',
      'budget:policy-write',
      'budget:policy-simulate',
      'budget:policy-activate',
      'session:revoke',
    ];
    for (const permission of adminOnlyGrants) {
      expect(editor.has(permission as (typeof ALL_PERMISSIONS)[number])).toBe(false);
    }
  });

  it('lightbridge-viewer carries budget:read-own/session:revoke-own but NOT budget:self-refill or any other budget:*/session:* grant (lightbridge-authz#325, resolves #294)', () => {
    const viewer = permissionsForRoles(['lightbridge-viewer']);
    expect(viewer.has('budget:read-own')).toBe(true);
    expect(viewer.has('session:revoke-own')).toBe(true);
    expect(viewer.has('budget:self-refill')).toBe(false);
    const adminOnlyGrants: readonly string[] = [
      'budget:read',
      'budget:review',
      'budget:grant',
      'budget:revoke',
      'budget:audit-read',
      'budget:policy-read',
      'budget:policy-write',
      'budget:policy-simulate',
      'budget:policy-activate',
      'session:revoke',
    ];
    for (const permission of adminOnlyGrants) {
      expect(viewer.has(permission as (typeof ALL_PERMISSIONS)[number])).toBe(false);
    }
  });
});

describe('permissionsForRoles (default mapping)', () => {
  it('admin role grants everything', () => {
    const admin = permissionsForRoles(['lightbridge-admin']);
    expect(admin.size).toBe(ALL_PERMISSIONS.length);
    expect(admin.has('account:delete')).toBe(true);
  });

  it('viewer role is read-only for account/project/apikey, plus self-service budget/session grants (lightbridge-authz#325)', () => {
    const viewer = permissionsForRoles(['lightbridge-viewer']);
    expect(viewer.has('project:read')).toBe(true);
    expect(viewer.has('project:create')).toBe(false);
    expect(viewer.has('account:delete')).toBe(false);
    // account:create was added to the viewer role by lightbridge-authz#325 (mirrors prod's
    // oauth2.rbac.role_permissions) -- it does NOT make the role broadly "account write", it's a
    // deliberate single addition alongside the self-service budget/session grants below.
    expect(viewer.has('account:create')).toBe(true);
    expect(viewer.has('account:update')).toBe(false);
    // Self-service grants every authenticated caller needs regardless of role.
    expect(viewer.has('budget:read-own')).toBe(true);
    expect(viewer.has('session:revoke-own')).toBe(true);
    // But NOT the self-refill/admin/review grants -- viewer stays read-only for those.
    expect(viewer.has('budget:self-refill')).toBe(false);
    expect(viewer.has('budget:review')).toBe(false);
    expect(viewer.has('session:revoke')).toBe(false);
  });

  it('editor role can manage projects and api-keys, self-refill budget, and manage own sessions, but not admin account/budget/session actions', () => {
    const editor = permissionsForRoles(['lightbridge-editor']);
    expect(editor.has('account:read')).toBe(true);
    // account:create was added to the editor role by lightbridge-authz#325 (mirrors prod's
    // oauth2.rbac.role_permissions); editors still cannot update/delete/disable accounts.
    expect(editor.has('account:create')).toBe(true);
    expect(editor.has('account:update')).toBe(false);
    expect(editor.has('account:disable')).toBe(false);
    expect(editor.has('project:create')).toBe(true);
    expect(editor.has('project:disable')).toBe(true);
    expect(editor.has('apikey:rotate')).toBe(true);
    // Deliberate widening from the ADR-0006 rename: the editor's `project:*` grant now also
    // confers roster management. Asserted explicitly so the change cannot happen silently again —
    // if editors should not manage rosters, the default mapping has to list grants individually
    // instead of using the wildcard, on this side AND in the backend's default_role_permissions.
    expect(editor.has('project:member')).toBe(true);
    // Self-service budget/session grants added by lightbridge-authz#325.
    expect(editor.has('budget:self-refill')).toBe(true);
    expect(editor.has('budget:read-own')).toBe(true);
    expect(editor.has('session:revoke-own')).toBe(true);
    // Still no admin-only budget/session actions.
    expect(editor.has('budget:review')).toBe(false);
    expect(editor.has('budget:grant')).toBe(false);
    expect(editor.has('session:revoke')).toBe(false);
  });

  it('unions grants across multiple roles and ignores unknown roles', () => {
    const set = permissionsForRoles(['lightbridge-viewer', 'unknown-role']);
    expect(set.has('project:read')).toBe(true);
    expect(set.has('project:delete')).toBe(false);
  });

  it('a configured mapping overrides the default', () => {
    const compiled = permissionsForRoles(['billing'], {
      billing: ['account:read'],
    });
    expect(compiled.has('account:read')).toBe(true);
    expect(compiled.size).toBe(1);
  });
});
