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

describe('budget:* permissions (issue #147)', () => {
  // The backend's Permission::ALL declares these ten budget permissions immediately after the
  // apikey:* group, in this exact order. Asserted as a literal array (not just "contains") so
  // any accidental reorder/alphabetization fails loudly.
  const BUDGET_PERMISSIONS_IN_ORDER = [
    'budget:read',
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

  it('ALL_PERMISSIONS has exactly 28 entries: the original 18 plus the ten budget:* additions', () => {
    expect(ALL_PERMISSIONS).toHaveLength(28);
  });

  it('all ten budget permissions are present, in the backend declaration order, after apikey:*', () => {
    const lastApikeyIndex = ALL_PERMISSIONS.lastIndexOf('apikey:validate');
    const budgetSlice = ALL_PERMISSIONS.slice(lastApikeyIndex + 1);
    expect(budgetSlice).toEqual(BUDGET_PERMISSIONS_IN_ORDER);
  });

  it('every budget permission appears in ALL_PERMISSIONS in relative order', () => {
    const indices = BUDGET_PERMISSIONS_IN_ORDER.map((permission) =>
      ALL_PERMISSIONS.indexOf(permission)
    );
    expect(indices.every((index) => index !== -1)).toBe(true);
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it('`*` expands to include every budget permission, including the hyphenated ones', () => {
    const all = expandGrant('*');
    for (const permission of BUDGET_PERMISSIONS_IN_ORDER) {
      expect(all).toContain(permission);
    }
  });

  it('`budget:*` expands to exactly the ten budget permissions and nothing else', () => {
    const budget = expandGrant('budget:*');
    expect(budget).toHaveLength(10);
    expect(budget).toEqual(BUDGET_PERMISSIONS_IN_ORDER);
    expect(budget).not.toContain('apikey:validate');
    expect(budget).not.toContain('account:create');
  });

  it('resourceOf-driven expansion is not fooled by the hyphen or extra segment in the action', () => {
    // budget:audit-read and budget:policy-simulate each contain a hyphen AND, textually, an
    // internal '-' that must NOT be mistaken for a second ':' resource separator. Confirm they
    // land under the `budget` resource, not e.g. a phantom `budget:audit` or `budget:policy`.
    const budget = expandGrant('budget:*');
    expect(budget).toContain('budget:audit-read');
    expect(budget).toContain('budget:policy-simulate');
    // And exact-match grants for the hyphenated permissions resolve to themselves only.
    expect(expandGrant('budget:audit-read')).toEqual(['budget:audit-read']);
    expect(expandGrant('budget:policy-simulate')).toEqual(['budget:policy-simulate']);
    expect(expandGrant('budget:self-refill')).toEqual(['budget:self-refill']);
  });

  it('a near-miss grant string does not accidentally match a hyphenated permission', () => {
    // Guards against a naive implementation that might split on '-' as well as ':'.
    expect(expandGrant('budget:audit')).toEqual([]);
    expect(expandGrant('budget:policy')).toEqual([]);
    expect(expandGrant('budget:self')).toEqual([]);
  });

  it('lightbridge-admin (bare "*") now also carries every budget permission', () => {
    const admin = permissionsForRoles(['lightbridge-admin']);
    for (const permission of BUDGET_PERMISSIONS_IN_ORDER) {
      expect(admin.has(permission)).toBe(true);
    }
    expect(admin.size).toBe(ALL_PERMISSIONS.length);
  });

  it('lightbridge-editor and lightbridge-viewer do NOT carry any budget:* grant (unresolved: lightbridge-authz#294)', () => {
    const editor = permissionsForRoles(['lightbridge-editor']);
    const viewer = permissionsForRoles(['lightbridge-viewer']);
    for (const permission of BUDGET_PERMISSIONS_IN_ORDER) {
      expect(editor.has(permission)).toBe(false);
      expect(viewer.has(permission)).toBe(false);
    }
  });
});

describe('permissionsForRoles (default mapping)', () => {
  it('admin role grants everything', () => {
    const admin = permissionsForRoles(['lightbridge-admin']);
    expect(admin.size).toBe(ALL_PERMISSIONS.length);
    expect(admin.has('account:delete')).toBe(true);
  });

  it('viewer role is read-only', () => {
    const viewer = permissionsForRoles(['lightbridge-viewer']);
    expect(viewer.has('project:read')).toBe(true);
    expect(viewer.has('project:create')).toBe(false);
    expect(viewer.has('account:delete')).toBe(false);
  });

  it('editor role can manage projects and api-keys but not accounts', () => {
    const editor = permissionsForRoles(['lightbridge-editor']);
    expect(editor.has('account:read')).toBe(true);
    expect(editor.has('account:create')).toBe(false);
    expect(editor.has('account:disable')).toBe(false);
    expect(editor.has('project:create')).toBe(true);
    expect(editor.has('project:disable')).toBe(true);
    expect(editor.has('apikey:rotate')).toBe(true);
    // Deliberate widening from the ADR-0006 rename: the editor's `project:*` grant now also
    // confers roster management. Asserted explicitly so the change cannot happen silently again —
    // if editors should not manage rosters, the default mapping has to list grants individually
    // instead of using the wildcard, on this side AND in the backend's default_role_permissions.
    expect(editor.has('project:member')).toBe(true);
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
