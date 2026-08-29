import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsoleSession } from './session';

/**
 * These cover the one path that stranded a live session (converse-frontends#358): an upstream
 * `401` that arrives when the proxy has no way to replace the token. Both refresh predicates
 * short-circuit on a missing `refreshToken`, so before this guard the proxy forwarded the
 * upstream body verbatim and left the cookie in place — the browser then held a session that
 * decrypted fine, reported `authenticated: true`, and could not make a single authorized call.
 */

const readSessionFromRequest = vi.fn();
const clearSession = vi.fn();
const writeSession = vi.fn();

vi.mock('./session-store', () => ({
  readSessionFromRequest: (...args: readonly unknown[]) => readSessionFromRequest(...args),
  clearSession: (...args: readonly unknown[]) => clearSession(...args),
  writeSession: (...args: readonly unknown[]) => writeSession(...args),
}));

const refreshSession = vi.fn();
vi.mock('./oidc', () => ({ refreshSession: (...a: readonly unknown[]) => refreshSession(...a) }));

const session = (overrides: Partial<ConsoleSession['tokens']> = {}): ConsoleSession =>
  ({
    sid: 'sid-1',
    user: { sub: 'u1', roles: ['lightbridge-admin'] },
    tokens: { accessToken: 'expired-token', ...overrides },
  }) as unknown as ConsoleSession;

const request = () =>
  new NextRequest('http://localhost:3000/api/rpc/model.Account.list', {
    method: 'POST',
    body: new Uint8Array([0xa0]),
  });

describe('proxyRequest — an unrefreshable 401 ends the session', () => {
  beforeEach(() => {
    vi.resetModules();
    readSessionFromRequest.mockReset();
    clearSession.mockReset();
    refreshSession.mockReset();
    writeSession.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('answers session_expired and clears the cookie when there is no refresh token', async () => {
    readSessionFromRequest.mockResolvedValue(session({ refreshToken: undefined }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"invalid bearer token"}', { status: 401 }))
    );

    const { proxyRequest } = await import('./proxy');
    const response = await proxyRequest(request(), {
      resolveTarget: () => 'https://upstream.invalid/rpc/model.Account.list',
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'session_expired' });
    // The whole point: the dead cookie is removed, so the next navigation can re-authenticate.
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it('does NOT end the session on a 403 — that is an unauthorized operation, not a dead token', async () => {
    readSessionFromRequest.mockResolvedValue(session({ refreshToken: undefined }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"forbidden"}', { status: 403 }))
    );

    const { proxyRequest } = await import('./proxy');
    const response = await proxyRequest(request(), {
      resolveTarget: () => 'https://upstream.invalid/rpc/model.Account.list',
    });

    expect(response.status).toBe(403);
    expect(clearSession).not.toHaveBeenCalled();
  });
});
