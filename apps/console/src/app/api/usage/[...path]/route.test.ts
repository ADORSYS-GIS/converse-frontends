import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * #304's own AC: "Existing behavior of the `/api/usage/*` proxy route (e.g. its
 * 503-when-unconfigured behavior) is not broken for callers relying on it." — this route had no
 * dedicated test before this ticket (only `usageTargetUrl`'s pure URL construction was covered,
 * in `server/proxy-target.test.ts`); this file is the regression net for the route handler's own
 * two behaviours: the 503 short-circuit when `usageUrl` is unset, and delegating to `proxyRequest`
 * with the right upstream target when it is.
 *
 * `serverEnv` and `proxyRequest` are mocked rather than exercised end to end: the deeper machinery
 * (session cookies, token refresh, byte-forwarding) already has its own coverage
 * (`refresh-policy.test.ts`, `session.test.ts`), and duplicating that here would test the same
 * thing twice while making this file fragile to unrelated changes in either module.
 */

const serverEnvMock = vi.fn();
vi.mock('../../../../server/env', () => ({
  serverEnv: () => serverEnvMock(),
}));

const proxyRequestMock = vi.fn();
vi.mock('../../../../server/proxy', () => ({
  proxyRequest: (...args: unknown[]) => proxyRequestMock(...args),
}));

/**
 * P1 security fix (IA v3 phase 1) — the scope-ownership guard's own wiring into this route.
 * `usage-scope-guard.test.ts` covers the guard's logic directly (pure predicate + resolver fakes);
 * these mocks let this file assert only the ROUTE's own responsibility: read the session, hand
 * the body to the guard for the one query path, and turn a rejection into a response WITHOUT ever
 * reaching `proxyRequest`.
 */
const readSessionFromRequestMock = vi.fn();
vi.mock('../../../../server/session-store', () => ({
  readSessionFromRequest: (...args: unknown[]) => readSessionFromRequestMock(...args),
}));

const guardUsageScopeMock = vi.fn();
vi.mock('../../../../server/usage-scope-guard', () => ({
  guardUsageScope: (...args: unknown[]) => guardUsageScopeMock(...args),
}));

vi.mock('../../../../server/authz-account-lookup', () => ({
  resolveOwnedAccountIds: vi.fn(),
  resolveProjectAccountId: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function postRequest(path: string[]) {
  return {
    request: new NextRequest(`http://localhost:3000/api/usage/${path.join('/')}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope: 'account', scope_id: 'acct_1' }),
    }),
    context: { params: Promise.resolve({ path }) },
  };
}

describe('POST /api/usage/[...path]', () => {
  it('answers 503 usage_backend_not_configured when usageUrl is unset, without calling proxyRequest', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: undefined });
    const { POST } = await import('./route');
    const { request, context } = postRequest(['usage', 'v1', 'usage', 'query']);

    const response = await POST(request, context);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'usage_backend_not_configured' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(proxyRequestMock).not.toHaveBeenCalled();
  });

  it('delegates to proxyRequest with the usage backend target when usageUrl is configured', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    const sentinelResponse = new Response(null, { status: 200 });
    proxyRequestMock.mockResolvedValue(sentinelResponse);
    const { POST } = await import('./route');
    const { request, context } = postRequest(['usage', 'v1', 'usage', 'query']);

    const response = await POST(request, context);

    expect(response).toBe(sentinelResponse);
    expect(proxyRequestMock).toHaveBeenCalledTimes(1);
    const [, options] = proxyRequestMock.mock.calls[0];
    expect(options.resolveTarget()).toBe('http://usage.internal/usage/v1/usage/query');
  });

  it('lets resolveTarget reject an unsafe path segment (traversal) before proxyRequest forwards anything', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    proxyRequestMock.mockImplementation((_req, { resolveTarget }) => {
      // Mirrors what `proxyRequest` itself does with a thrown `InvalidProxyPathError` — this test
      // only asserts `resolveTarget` throws for a traversal segment, the same contract
      // `proxy-target.test.ts` already covers directly.
      expect(() => resolveTarget()).toThrow();
      return Promise.resolve(new Response(null, { status: 400 }));
    });
    const { POST } = await import('./route');
    const { request, context } = postRequest(['..', 'etc']);

    await POST(request, context);

    expect(proxyRequestMock).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/usage/usage/v1/usage/query scope-ownership guard (P1 security fix)', () => {
  it('rejects a foreign scope_id with 403 before proxyRequest ever runs', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    readSessionFromRequestMock.mockResolvedValue({ tokens: { accessToken: 'tok' } });
    guardUsageScopeMock.mockResolvedValue({ ok: false, status: 403, error: 'scope_not_owned' });
    const { POST } = await import('./route');
    const { request, context } = postRequest(['usage', 'v1', 'usage', 'query']);

    const response = await POST(request, context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'scope_not_owned' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(proxyRequestMock).not.toHaveBeenCalled();
  });

  it('answers 400 invalid_body for a malformed body without calling proxyRequest', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    readSessionFromRequestMock.mockResolvedValue({ tokens: { accessToken: 'tok' } });
    guardUsageScopeMock.mockResolvedValue({ ok: false, status: 400, error: 'invalid_body' });
    const { POST } = await import('./route');
    const { request, context } = postRequest(['usage', 'v1', 'usage', 'query']);

    const response = await POST(request, context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_body' });
    expect(proxyRequestMock).not.toHaveBeenCalled();
  });

  it('proxies through once the guard passes', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    readSessionFromRequestMock.mockResolvedValue({ tokens: { accessToken: 'tok' } });
    guardUsageScopeMock.mockResolvedValue({ ok: true });
    const sentinelResponse = new Response(null, { status: 200 });
    proxyRequestMock.mockResolvedValue(sentinelResponse);
    const { POST } = await import('./route');
    const { request, context } = postRequest(['usage', 'v1', 'usage', 'query']);

    const response = await POST(request, context);

    expect(response).toBe(sentinelResponse);
    expect(proxyRequestMock).toHaveBeenCalledTimes(1);
  });

  it('never reads the session or runs the guard for a non-query usage path (e.g. otel ingestion)', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    const sentinelResponse = new Response(null, { status: 200 });
    proxyRequestMock.mockResolvedValue(sentinelResponse);
    const { POST } = await import('./route');
    const { request, context } = postRequest(['v1', 'otel', 'logs']);

    const response = await POST(request, context);

    expect(response).toBe(sentinelResponse);
    expect(readSessionFromRequestMock).not.toHaveBeenCalled();
    expect(guardUsageScopeMock).not.toHaveBeenCalled();
  });

  it('skips the guard and proceeds to proxyRequest when there is no session — proxyRequest owns the 401 there', async () => {
    serverEnvMock.mockReturnValue({ usageUrl: 'http://usage.internal' });
    readSessionFromRequestMock.mockResolvedValue(null);
    const sentinelResponse = new Response(null, { status: 401 });
    proxyRequestMock.mockResolvedValue(sentinelResponse);
    const { POST } = await import('./route');
    const { request, context } = postRequest(['usage', 'v1', 'usage', 'query']);

    const response = await POST(request, context);

    expect(response).toBe(sentinelResponse);
    expect(guardUsageScopeMock).not.toHaveBeenCalled();
    expect(proxyRequestMock).toHaveBeenCalledTimes(1);
  });
});
