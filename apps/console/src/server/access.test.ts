import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsoleSession } from './session';

/**
 * `server/access.ts` — the gate every `/admin/*` route segment calls, and the fail-closed
 * behaviour of the `getMyAccess` fetch behind it (converse-frontends#452, story C9).
 */

const getMyAccess = vi.fn();
vi.mock('./authz-account-lookup', () => ({
  authzClient: async () => ({ procedures: { getMyAccess } }),
}));

const { can, canAny, canReachAdminArea, fetchMyAccess } = await import('./access');

function session(permissions: string[]): ConsoleSession {
  return {
    sid: 'sid-1',
    tokens: { accessToken: 'access-1' },
    user: {
      sub: 'acct_1',
      platformUserId: 'person_1',
      roles: [],
      permissions,
      accessVerified: true,
    },
  };
}

beforeEach(() => {
  getMyAccess.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('can', () => {
  it('answers from the session’s own permission set', () => {
    expect(can(session(['rbac:manage']), 'rbac:manage')).toBe(true);
    expect(can(session(['rbac:manage']), 'usage:read-all')).toBe(false);
  });

  // Every route segment writes `!session || !can(session, …)`, so this arm is exercised on every
  // signed-out request; it must answer without a special case rather than throwing.
  it('is false for no session at all', () => {
    expect(can(null, 'rbac:manage')).toBe(false);
    expect(can(undefined, 'rbac:manage')).toBe(false);
  });
});

describe('canAny / canReachAdminArea', () => {
  it('needs only one of the candidates', () => {
    expect(canAny(session(['budget:review']), ['usage:read-all', 'budget:review'])).toBe(true);
    expect(canAny(session(['budget:review']), ['usage:read-all'])).toBe(false);
  });

  it('puts a single-permission reviewer inside the admin area, and a plain viewer outside it', () => {
    expect(canReachAdminArea(session(['budget:review']))).toBe(true);
    // The post-cutover default (owner ruling: account owners map to `lightbridge-viewer`).
    expect(canReachAdminArea(session(['account:read', 'apikey:read', 'budget:read-own']))).toBe(
      false
    );
    expect(canReachAdminArea(null)).toBe(false);
  });
});

describe('fetchMyAccess', () => {
  it('returns the server’s own answer verbatim when the call succeeds', async () => {
    getMyAccess.mockResolvedValue({
      userId: 'person_1',
      roles: ['lightbridge-admin'],
      permissions: ['usage:read-all', 'rbac:manage'],
    });

    await expect(fetchMyAccess('access-1')).resolves.toEqual({
      userId: 'person_1',
      roles: ['lightbridge-admin'],
      permissions: ['usage:read-all', 'rbac:manage'],
      accessVerified: true,
    });
    expect(getMyAccess).toHaveBeenCalledWith({ args: {} });
  });

  /**
   * converse-frontends#452, negative AC 1. The failure mode this forbids is subtle: an "assume
   * admin" or "fall back to the token's role claim" branch would make a broken `getMyAccess`
   * INVISIBLE — the console would keep working, off exactly the claim this story exists to stop
   * trusting, and nobody would find out until the claim disagreed with the server.
   */
  it('fails closed to an empty permission set when the call throws — never a role-derived fallback', async () => {
    getMyAccess.mockRejectedValue(new Error('authz-api unreachable'));

    const access = await fetchMyAccess('access-1', ['lightbridge-admin']);

    expect(access.permissions).toEqual([]);
    expect(access.accessVerified).toBe(false);
    expect(access.userId).toBe('');
    // The claim roles survive for DISPLAY only — the identity row still has something honest to
    // show — and no gate reads them.
    expect(access.roles).toEqual(['lightbridge-admin']);
  });

  it('does not throw out of the session build on failure', async () => {
    getMyAccess.mockRejectedValue(new Error('boom'));
    await expect(fetchMyAccess('access-1')).resolves.toBeDefined();
  });
});
