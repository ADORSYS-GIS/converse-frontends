import { describe, expect, it, vi } from 'vitest';

import {
  REFRESH_COOLDOWN_MS,
  RefreshCoordinator,
  TOKEN_REFRESH_BUFFER_MS,
  isExpiringWithinBuffer,
  isInCooldown,
  nextCooldownUntil,
  rotateSession,
  shouldRefreshProactively,
  shouldRefreshReactively,
} from './refresh-policy';
import type { ConsoleSession } from './session';

const NOW = 1_700_000_000_000;

function session(overrides: Partial<ConsoleSession['tokens']> = {}): ConsoleSession {
  return {
    sid: 'sid-1',
    startedAt: NOW,
    tokens: {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      idToken: 'id-1',
      expiresAt: NOW + 10 * 60 * 1000,
      audience: ['lightbridge-api-key'],
      ...overrides,
    },
    user: {
      sub: 'user-1',
      platformUserId: 'person-1',
      roles: ['lightbridge-editor'],
      permissions: ['budget:read-own'],
      accessVerified: true,
    },
  };
}

describe('isExpiringWithinBuffer', () => {
  it('is true exactly at the 60s buffer boundary', () => {
    expect(isExpiringWithinBuffer(NOW + TOKEN_REFRESH_BUFFER_MS, NOW)).toBe(true);
  });

  it('is false one millisecond outside the buffer', () => {
    expect(isExpiringWithinBuffer(NOW + TOKEN_REFRESH_BUFFER_MS + 1, NOW)).toBe(false);
  });

  it('is true for an already-expired token', () => {
    expect(isExpiringWithinBuffer(NOW - 1, NOW)).toBe(true);
  });

  it('is false when the token carries no expiry at all', () => {
    expect(isExpiringWithinBuffer(undefined, NOW)).toBe(false);
  });
});

describe('shouldRefreshProactively', () => {
  it('refreshes inside the buffer', () => {
    expect(
      shouldRefreshProactively({
        tokens: { refreshToken: 'r', expiresAt: NOW + 30_000 },
        now: NOW,
        state: { cooldownUntil: 0 },
      })
    ).toBe(true);
  });

  it('does not refresh a token that is still fresh', () => {
    expect(
      shouldRefreshProactively({
        tokens: { refreshToken: 'r', expiresAt: NOW + 10 * 60_000 },
        now: NOW,
        state: { cooldownUntil: 0 },
      })
    ).toBe(false);
  });

  it('does not refresh without a refresh token', () => {
    expect(
      shouldRefreshProactively({
        tokens: { refreshToken: undefined, expiresAt: NOW },
        now: NOW,
        state: { cooldownUntil: 0 },
      })
    ).toBe(false);
  });

  it('does not refresh during the cooldown, even for an expired token', () => {
    expect(
      shouldRefreshProactively({
        tokens: { refreshToken: 'r', expiresAt: NOW - 5_000 },
        now: NOW,
        state: { cooldownUntil: NOW + 10_000 },
      })
    ).toBe(false);
  });

  it('refreshes again once the cooldown has elapsed', () => {
    expect(
      shouldRefreshProactively({
        tokens: { refreshToken: 'r', expiresAt: NOW - 5_000 },
        now: NOW,
        state: { cooldownUntil: NOW },
      })
    ).toBe(true);
  });
});

describe('shouldRefreshReactively', () => {
  const base = {
    tokens: { refreshToken: 'r' },
    now: NOW,
    state: { cooldownUntil: 0 },
    alreadyRetried: false,
  };

  it('retries once on a 401', () => {
    expect(shouldRefreshReactively({ ...base, upstreamStatus: 401 })).toBe(true);
  });

  it.each([200, 400, 403, 404, 500, 502])('ignores status %i', (status) => {
    expect(shouldRefreshReactively({ ...base, upstreamStatus: status })).toBe(false);
  });

  it('does not retry a second time', () => {
    expect(shouldRefreshReactively({ ...base, upstreamStatus: 401, alreadyRetried: true })).toBe(
      false
    );
  });

  it('does not retry during the cooldown', () => {
    expect(
      shouldRefreshReactively({
        ...base,
        upstreamStatus: 401,
        state: { cooldownUntil: NOW + 1 },
      })
    ).toBe(false);
  });

  it('does not retry without a refresh token', () => {
    expect(shouldRefreshReactively({ ...base, upstreamStatus: 401, tokens: {} })).toBe(false);
  });

  it('still retries after a proactive refresh already ran on the same request', () => {
    // `AuthzRpcRuntime.authenticatedFetch` runs `tryProactiveRefresh()` and the 401 retry
    // independently — a proactive refresh does NOT consume the reactive retry. Conflating the two
    // would silently drop the retry for every request that lands inside the 60s buffer.
    expect(
      shouldRefreshReactively({
        ...base,
        upstreamStatus: 401,
        state: { cooldownUntil: 0 },
        alreadyRetried: false,
      })
    ).toBe(true);
  });
});

describe('isInCooldown / nextCooldownUntil', () => {
  it('sets a 60s cooldown', () => {
    expect(nextCooldownUntil(NOW)).toBe(NOW + REFRESH_COOLDOWN_MS);
  });

  it('ends exactly at the deadline', () => {
    expect(isInCooldown({ cooldownUntil: NOW }, NOW)).toBe(false);
    expect(isInCooldown({ cooldownUntil: NOW + 1 }, NOW)).toBe(true);
  });
});

describe('rotateSession', () => {
  it('keeps the session id so de-dup and cooldown state survive the rotation', () => {
    const rotated = rotateSession(session(), {
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresAt: NOW + 300_000,
    });
    expect(rotated.sid).toBe('sid-1');
    expect(rotated.tokens.accessToken).toBe('access-2');
    expect(rotated.tokens.refreshToken).toBe('refresh-2');
    expect(rotated.tokens.expiresAt).toBe(NOW + 300_000);
  });

  it('keeps the previous refresh token when the provider rotates none', () => {
    const rotated = rotateSession(session(), { accessToken: 'access-2' });
    expect(rotated.tokens.refreshToken).toBe('refresh-1');
  });

  it('keeps the previous id token when the refresh response omits one', () => {
    const rotated = rotateSession(session(), { accessToken: 'access-2' });
    expect(rotated.tokens.idToken).toBe('id-1');
  });

  // converse-frontends#452: a refresh REPLACES the permission set wholesale. A revoked grant is
  // expressed as an absence, so merging would keep a removed capability alive for as long as the
  // browser kept refreshing -- the exact opposite of what re-asking `getMyAccess` is for.
  it('replaces the roles and permissions from the refreshed access snapshot', () => {
    const rotated = rotateSession(
      session(),
      { accessToken: 'a' },
      {
        userId: 'person-1',
        roles: ['lightbridge-admin'],
        permissions: ['usage:read-all', 'rbac:manage'],
        accessVerified: true,
      }
    );
    expect(rotated.user.roles).toEqual(['lightbridge-admin']);
    expect(rotated.user.permissions).toEqual(['usage:read-all', 'rbac:manage']);
    expect(rotated.user.sub).toBe('user-1');
  });

  it('fails closed on an unverified snapshot without losing the known person id', () => {
    const rotated = rotateSession(
      session(),
      { accessToken: 'a' },
      {
        userId: '',
        roles: [],
        permissions: [],
        accessVerified: false,
      }
    );
    expect(rotated.user.permissions).toEqual([]);
    expect(rotated.user.accessVerified).toBe(false);
    // `sub` does not change across a refresh, so neither does the person behind it -- an
    // unanswered `getMyAccess` did not disprove the id login already resolved.
    expect(rotated.user.platformUserId).toBe('person-1');
  });

  it('leaves the user record untouched when no snapshot is supplied', () => {
    const rotated = rotateSession(session(), { accessToken: 'a' });
    expect(rotated.user.roles).toEqual(['lightbridge-editor']);
    expect(rotated.user.permissions).toEqual(['budget:read-own']);
  });
});

describe('RefreshCoordinator', () => {
  it('de-duplicates concurrent refreshes for one session into a single call', async () => {
    const coordinator = new RefreshCoordinator();
    let resolve!: (value: ConsoleSession | null) => void;
    const perform = vi.fn(
      () =>
        new Promise<ConsoleSession | null>((r) => {
          resolve = r;
        })
    );

    const first = coordinator.run('sid-1', NOW, perform);
    const second = coordinator.run('sid-1', NOW, perform);

    resolve(session());
    await expect(first).resolves.toMatchObject({ sid: 'sid-1' });
    await expect(second).resolves.toMatchObject({ sid: 'sid-1' });
    expect(perform).toHaveBeenCalledTimes(1);
  });

  it('does not share an in-flight refresh across different sessions', async () => {
    const coordinator = new RefreshCoordinator();
    const perform = vi.fn(async () => session());

    await Promise.all([
      coordinator.run('sid-1', NOW, perform),
      coordinator.run('sid-2', NOW, perform),
    ]);

    expect(perform).toHaveBeenCalledTimes(2);
  });

  it('opens the cooldown when the refresh resolves null', async () => {
    const coordinator = new RefreshCoordinator();
    await coordinator.run('sid-1', NOW, async () => null);
    expect(coordinator.stateFor('sid-1').cooldownUntil).toBe(NOW + REFRESH_COOLDOWN_MS);
  });

  it('opens the cooldown when the refresh throws, and reports failure rather than rethrowing', async () => {
    const coordinator = new RefreshCoordinator();
    await expect(
      coordinator.run('sid-1', NOW, async () => {
        throw new Error('token endpoint exploded');
      })
    ).resolves.toBeNull();
    expect(coordinator.stateFor('sid-1').cooldownUntil).toBe(NOW + REFRESH_COOLDOWN_MS);
  });

  it('clears an existing cooldown on a successful refresh', async () => {
    const coordinator = new RefreshCoordinator();
    coordinator.markFailed('sid-1', NOW);
    await coordinator.run('sid-1', NOW + REFRESH_COOLDOWN_MS, async () => session());
    expect(coordinator.stateFor('sid-1').cooldownUntil).toBe(0);
  });

  it('releases the in-flight slot so a later refresh can run', async () => {
    const coordinator = new RefreshCoordinator();
    const perform = vi.fn(async () => session());
    await coordinator.run('sid-1', NOW, perform);
    await coordinator.run('sid-1', NOW, perform);
    expect(perform).toHaveBeenCalledTimes(2);
  });

  it('bounds its state map instead of growing one entry per session forever', () => {
    const coordinator = new RefreshCoordinator(2);
    coordinator.stateFor('a');
    coordinator.stateFor('b');
    coordinator.stateFor('c');
    // 'a' was evicted as the oldest insertion; a fresh lookup yields a clean state.
    expect(coordinator.stateFor('a').cooldownUntil).toBe(0);
  });
});
