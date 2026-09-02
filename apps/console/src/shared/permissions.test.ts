import { describe, expect, it } from 'vitest';

import {
  ADMIN_AREA_PERMISSIONS,
  PERMISSION,
  PLATFORM_ROLES,
  hasAnyPermission,
  hasPermission,
} from './permissions';

/**
 * The permission vocabulary and the two membership tests every gate in the console is built from
 * (converse-frontends#452, story C9).
 */
describe('PERMISSION', () => {
  /**
   * The spellings, pinned character-for-character against `lightbridge-authz-core`'s own
   * `Permission::as_str`.
   *
   * This is the one failure mode a type system cannot catch: a typo is not a compile error, it is
   * a permission nobody ever holds — which fails closed as a screen that silently disappeared for
   * everyone, with no error anywhere. Reading the upstream enum and pinning it here turns an
   * upstream rename into a failing test instead.
   */
  it('spells every permission exactly as the backend enum does', () => {
    expect(PERMISSION).toEqual({
      usageReadAll: 'usage:read-all',
      budgetReview: 'budget:review',
      budgetPolicyWrite: 'budget:policy-write',
      budgetScheduleManage: 'budget:schedule-manage',
      rbacManage: 'rbac:manage',
      userRead: 'user:read',
      apiKeyDelete: 'apikey:delete',
      apiKeyRead: 'apikey:read',
      projectRead: 'project:read',
      budgetReadOwn: 'budget:read-own',
    });
  });

  it('lists exactly the destination permissions in the admin-area set', () => {
    // `user:read` is deliberately absent: it is a supporting read (resolving a name for a row),
    // never a destination, so holding it alone must not conjure an admin area with nothing in it.
    expect([...ADMIN_AREA_PERMISSIONS]).toEqual([
      'usage:read-all',
      'budget:review',
      'budget:policy-write',
      'budget:schedule-manage',
      'rbac:manage',
    ]);
  });

  it('states the grantable platform roles most-privileged first', () => {
    expect([...PLATFORM_ROLES]).toEqual([
      'lightbridge-admin',
      'lightbridge-editor',
      'lightbridge-viewer',
    ]);
  });
});

describe('hasPermission', () => {
  it('is exact membership', () => {
    expect(hasPermission(['usage:read-all'], PERMISSION.usageReadAll)).toBe(true);
    expect(hasPermission(['usage:read-all'], PERMISSION.rbacManage)).toBe(false);
  });

  it('fails closed for an empty or absent permission set', () => {
    expect(hasPermission([], PERMISSION.rbacManage)).toBe(false);
    expect(hasPermission(undefined, PERMISSION.rbacManage)).toBe(false);
  });

  /**
   * The whole point of the story: the console does not re-derive authorization. `getMyAccess`
   * returns permissions ALREADY expanded server-side, so a wildcard reaching this function would
   * mean the backend changed its contract — and silently honouring it here would be the console
   * re-implementing the role→permission map one `startsWith` at a time, which is exactly the drift
   * `packages/hooks/src/rbac.ts` documents going stale against prod for two releases.
   */
  it('does not expand a wildcard, ever', () => {
    expect(hasPermission(['*'], PERMISSION.rbacManage)).toBe(false);
    expect(hasPermission(['rbac:*'], PERMISSION.rbacManage)).toBe(false);
    expect(hasPermission(['budget:*'], PERMISSION.budgetReview)).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('is true on the first match and false on none', () => {
    expect(hasAnyPermission(['budget:review'], ADMIN_AREA_PERMISSIONS)).toBe(true);
    // The post-cutover default: an account owner maps to `lightbridge-viewer`, whose permissions
    // include none of the admin-area set — so they see no admin nav at all.
    expect(
      hasAnyPermission(
        ['account:read', 'project:read', 'apikey:read', 'budget:read-own', 'session:revoke-own'],
        ADMIN_AREA_PERMISSIONS
      )
    ).toBe(false);
  });

  it('is false for an empty candidate list rather than vacuously true', () => {
    expect(hasAnyPermission(['rbac:manage'], [])).toBe(false);
  });
});
