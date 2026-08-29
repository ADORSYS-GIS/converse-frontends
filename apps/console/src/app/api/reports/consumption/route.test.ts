import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetServerEnvCacheForTests } from '../../../../server/env';
import { chunkCookieName, chunkCookieValue, sealSession } from '../../../../server/session';
import type { ConsoleSession } from '../../../../server/session';

const SESSION_SECRET = 'a'.repeat(48);

const BASE_CONFIG_LINES = [
  'session:',
  `  secret: "${SESSION_SECRET}"`,
  'idp:',
  '  issuer: "http://localhost:13444/realms/dev"',
  '  clientId: "self-service"',
  'backendUrl: "http://localhost:13000"',
];

function writeConfig(configDir: string, extraLines: string[] = []): void {
  writeFileSync(
    join(configDir, 'config.yaml'),
    [...BASE_CONFIG_LINES, ...extraLines, ''].join('\n')
  );
}

const VALID_SESSION: ConsoleSession = {
  sid: 'sid_1',
  tokens: {
    accessToken: 'access-token-1',
    refreshToken: 'refresh-token-1',
    // Far in the future — never triggers the proactive-refresh branch in these tests.
    expiresAt: Date.now() + 60 * 60 * 1000,
  },
  user: { sub: 'acct_01', roles: [] },
};

async function sessionCookieHeader(session: ConsoleSession = VALID_SESSION): Promise<string> {
  const sealed = await sealSession(session, SESSION_SECRET);
  return chunkCookieValue(sealed)
    .map((chunk, index) => `${chunkCookieName(index)}=${chunk}`)
    .join('; ');
}

function requestFor(query: string, cookie?: string): NextRequest {
  return new NextRequest(`https://console.example/api/reports/consumption${query}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe('GET /api/reports/consumption', () => {
  let configDir: string;
  const originalConsoleConfig = process.env.CONSOLE_CONFIG;
  const originalFetch = global.fetch;

  beforeEach(() => {
    configDir = mkdtempSync(join(tmpdir(), 'console-consumption-route-test-'));
  });

  afterEach(() => {
    if (originalConsoleConfig === undefined) delete process.env.CONSOLE_CONFIG;
    else process.env.CONSOLE_CONFIG = originalConsoleConfig;
    __resetServerEnvCacheForTests();
    rmSync(configDir, { recursive: true, force: true });
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects an unauthenticated request with 401, without ever calling the usage backend', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { GET } = await import('./route');
    const response = await GET(requestFor('?month=2026-02&account=acct_01'));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing month with 400, without calling the usage backend', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    const response = await GET(requestFor('?account=acct_01', cookie));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_month');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['2026-13', '2026/02', 'not-a-month'])(
    'rejects a malformed month %s with 400',
    async (month) => {
      writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
      process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
      __resetServerEnvCacheForTests();

      const { GET } = await import('./route');
      const cookie = await sessionCookieHeader();
      const response = await GET(requestFor(`?month=${month}&account=acct_01`, cookie));

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe('invalid_month');
    }
  );

  it('rejects a request with no account scope with 400', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    const response = await GET(requestFor('?month=2026-02', cookie));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('missing_account');
  });

  it('answers 503 rather than pretending when the usage backend is not configured', async () => {
    writeConfig(configDir);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    const response = await GET(requestFor('?month=2026-02&account=acct_01', cookie));

    expect(response.status).toBe(503);
  });

  it('answers 502, not a crash, when the usage backend is unreachable', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    const response = await GET(requestFor('?month=2026-02&account=acct_01', cookie));

    expect(response.status).toBe(502);
  });

  it('answers 502, not an empty CSV, when the usage backend rejects the query', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('{"error":"bad_request"}', { status: 400 })
      ) as unknown as typeof fetch;

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    const response = await GET(requestFor('?month=2026-02&account=acct_01', cookie));

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).not.toBe('text/csv; charset=utf-8');
  });

  it('queries the usage backend scoped to the requested account and month, authenticated with the session token', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ points: [] }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    await GET(requestFor('?month=2026-02&account=acct_01&project=proj_1', cookie));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:14000/usage/v1/usage/query');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer access-token-1' });

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      scope: 'account',
      scope_id: 'acct_01',
      start_time: '2026-02-01T00:00:00.000Z',
      end_time: '2026-03-01T00:00:00.000Z',
      group_by: ['project_id', 'model'],
      filters: { project_id: 'proj_1' },
    });
  });

  it('streams a valid CSV grouped by project × model with totals, with the right headers', async () => {
    writeConfig(configDir, ['usageUrl: "http://localhost:14000"']);
    process.env.CONSOLE_CONFIG = join(configDir, 'config.yaml');
    __resetServerEnvCacheForTests();
    const points = [
      {
        project_id: 'proj_1',
        model: 'gpt-4',
        requests: 10,
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        total_cost: 1.5,
      },
    ];
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ points }), { status: 200 })
      ) as unknown as typeof fetch;

    const { GET } = await import('./route');
    const cookie = await sessionCookieHeader();
    const response = await GET(requestFor('?month=2026-02&account=acct_01', cookie));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="consumption-2026-02.csv"'
    );

    const text = await response.text();
    expect(text).toBe(
      'project,model,requests,prompt_tokens,completion_tokens,total_tokens,total_cost_usd\r\n' +
        'proj_1,gpt-4,10,100,50,150,0.000002\r\n' +
        'TOTAL,,10,100,50,150,0.000002\r\n'
    );
  });
});
