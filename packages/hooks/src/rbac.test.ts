import { describe, expect, it } from 'vitest';

import { ALL_PERMISSIONS, expandGrant, permissionsForRoles } from './rbac';

// Ported from lightbridge-authz's crates/lightbridge-authz-core/src/authz.rs test module,
// so the client-side mirror is checked against the same cases as the server it mirrors.

describe('expandGrant', () => {
  it('wildcard expands to every permission', () => {
    expect(expandGrant('*')).toHaveLength(ALL_PERMISSIONS.length);
  });

  it('resource wildcard expands to that resource\'s actions', () => {
    const project = expandGrant('project:*');
    expect(project).toHaveLength(5);
    expect(project).toContain('project:create');
    expect(project).toContain('project:delete');
    expect(project).toContain('project:disable');
    expect(project).not.toContain('account:create');
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
