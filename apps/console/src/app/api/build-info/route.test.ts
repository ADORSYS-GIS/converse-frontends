import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `GET /api/build-info` (lightbridge-authz#573) — the route's own two responsibilities, and
 * nothing deeper: the session gate, and passing the per-service results through untouched.
 *
 * `readBackendBuildInfo` is mocked; its own behaviour (concurrency, per-service isolation, the
 * URL-never-leaks rule) is covered directly in `server/build-info.test.ts` and duplicating it here
 * would test the same thing twice while making this file fragile to changes in that module.
 */

const readSessionFromRequestMock = vi.fn();
vi.mock('../../../server/session-store', () => ({
  readSessionFromRequest: (...args: unknown[]) => readSessionFromRequestMock(...args),
}));

const readBackendBuildInfoMock = vi.fn();
vi.mock('../../../server/build-info', () => ({
  readBackendBuildInfo: () => readBackendBuildInfoMock(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function get() {
  return new NextRequest('http://localhost:3000/api/build-info', { method: 'GET' });
}

describe('GET /api/build-info', () => {
  it('refuses an anonymous caller without ever touching a backend', async () => {
    readSessionFromRequestMock.mockResolvedValue(null);
    const { GET } = await import('./route');

    const response = await GET(get());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' });
    // The gate is not about the version string being secret — it is about not letting an
    // anonymous caller make the console fan out to internal origins on their behalf. So the
    // backends must not be reached at all, not merely have their answer withheld.
    expect(readBackendBuildInfoMock).not.toHaveBeenCalled();
  });

  it('returns every service result, including the failed ones, with a 200', async () => {
    readSessionFromRequestMock.mockResolvedValue({ user: { sub: 'sub-1' } });
    readBackendBuildInfoMock.mockResolvedValue([
      { id: 'authz-idp', status: 'ready', facts: { version: '0.8.1' } },
      { id: 'authz-usage', status: 'error', message: 'The service did not answer.' },
    ]);
    const { GET } = await import('./route');

    const response = await GET(get());

    // A blanket 502 would collapse "the IdP is down" and "there is no usage backend here" into one
    // unhelpful blank; the screen renders the three per-service states differently on purpose.
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      services: [
        { id: 'authz-idp', status: 'ready', facts: { version: '0.8.1' } },
        { id: 'authz-usage', status: 'error', message: 'The service did not answer.' },
      ],
    });
  });

  it('is never cached — a stale answer during a rollout is the wrong answer', async () => {
    readSessionFromRequestMock.mockResolvedValue({ user: { sub: 'sub-1' } });
    readBackendBuildInfoMock.mockResolvedValue([]);
    const { GET } = await import('./route');

    const response = await GET(get());
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
