import { beforeEach, describe, expect, it, vi } from 'vitest';

const performRefreshGrantMock = vi.fn();
vi.mock('./refresh-grant', () => ({
  performRefreshGrant: (...args: unknown[]) => performRefreshGrantMock(...args),
}));

const { refreshOnce } = await import('./refresh-coordinator');

const config = {
  issuer: 'https://auth.example.com',
  clientId: 'lci',
  redirectUri: 'https://lci.example.com/api/auth/callback',
  postLogoutRedirectUri: 'https://lci.example.com',
  scope: 'openid',
};

describe('refreshOnce', () => {
  beforeEach(() => {
    performRefreshGrantMock.mockReset();
  });

  it('makes one real exchange when two callers race the same refresh token', async () => {
    let resolve!: (value: { ok: true; data: { accessToken: string; expiresIn: number } }) => void;
    performRefreshGrantMock.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );

    const first = refreshOnce('token-a', config);
    const second = refreshOnce('token-a', config);

    resolve({ ok: true, data: { accessToken: 'new-access', expiresIn: 1800 } });

    expect(await first).toBe(await second);
    expect(performRefreshGrantMock).toHaveBeenCalledTimes(1);
  });

  it('exchanges different refresh tokens independently', async () => {
    performRefreshGrantMock
      .mockResolvedValueOnce({ ok: true, data: { accessToken: 'access-a', expiresIn: 1800 } })
      .mockResolvedValueOnce({ ok: true, data: { accessToken: 'access-b', expiresIn: 1800 } });

    const [a, b] = await Promise.all([
      refreshOnce('token-a', config),
      refreshOnce('token-b', config),
    ]);

    expect(a).toEqual({ ok: true, data: { accessToken: 'access-a', expiresIn: 1800 } });
    expect(b).toEqual({ ok: true, data: { accessToken: 'access-b', expiresIn: 1800 } });
    expect(performRefreshGrantMock).toHaveBeenCalledTimes(2);
  });

  it('allows a fresh exchange once the in-flight one has settled', async () => {
    performRefreshGrantMock
      .mockResolvedValueOnce({ ok: true, data: { accessToken: 'first', expiresIn: 1800 } })
      .mockResolvedValueOnce({ ok: true, data: { accessToken: 'second', expiresIn: 1800 } });

    await refreshOnce('token-a', config);
    await refreshOnce('token-a', config);

    expect(performRefreshGrantMock).toHaveBeenCalledTimes(2);
  });

  it('clears the in-flight entry even when the exchange fails, so a retry is not stuck forever', async () => {
    performRefreshGrantMock
      .mockResolvedValueOnce({ ok: false, reason: 'unavailable' })
      .mockResolvedValueOnce({ ok: true, data: { accessToken: 'retry', expiresIn: 1800 } });

    const failed = await refreshOnce('token-a', config);
    const retried = await refreshOnce('token-a', config);

    expect(failed).toEqual({ ok: false, reason: 'unavailable' });
    expect(retried).toEqual({ ok: true, data: { accessToken: 'retry', expiresIn: 1800 } });
    expect(performRefreshGrantMock).toHaveBeenCalledTimes(2);
  });
});
