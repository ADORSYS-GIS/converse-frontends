import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetServerEnvCacheForTests } from '../../../server/env';
import { AUTH_STATE_COOKIE_NAME, sealAuthState } from '../../../server/session';

/**
 * Regression coverage for the production incident where `/auth/callback` sent the code exchange
 * to Keycloak with an internal `redirect_uri` (the request's own origin, as seen behind Traefik's
 * TLS-terminating proxy) instead of the configured public one — Keycloak answered "Incorrect
 * redirect_uri" even though `/auth/login` had sent the correct, public `redirect_uri` at the
 * authorize step.
 *
 * `server/oidc`'s `exchangeCode` is mocked so this stays a pure unit test of *which URL the route
 * hands to `openid-client`* — it never talks to a real Keycloak. `openid-client` v6 derives the
 * token request's `redirect_uri` from `currentUrl`'s origin + pathname (see route.ts's inline
 * comment), so asserting on the captured `currentUrl` is asserting on the exact value that would
 * have been sent as `redirect_uri`.
 */
const exchangeCodeMock = vi.fn();

vi.mock('../../../server/oidc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/oidc')>();
  return {
    ...actual,
    exchangeCode: (...args: Parameters<typeof actual.exchangeCode>) => exchangeCodeMock(...args),
  };
});

const SESSION_SECRET = 'a'.repeat(48);
const PUBLIC_BASE_URL = 'https://console.ai.camer.digital';
/** Stands in for the internal address Traefik forwards to once TLS is terminated — wrong scheme
 *  and wrong host relative to `PUBLIC_BASE_URL`, on purpose, so either mismatch alone would fail
 *  this test if the fix regressed. */
const INTERNAL_REQUEST_ORIGIN = 'http://10.42.0.7:3000';

describe('GET /auth/callback — redirect_uri origin behind a TLS-terminating proxy', () => {
  let configDir: string;
  const originalConsoleConfig = process.env.CONSOLE_CONFIG;

  beforeEach(() => {
    configDir = mkdtempSync(join(tmpdir(), 'console-auth-callback-test-'));
    const configPath = join(configDir, 'config.yaml');
    writeFileSync(
      configPath,
      [
        'session:',
        `  secret: "${SESSION_SECRET}"`,
        'idp:',
        '  issuer: "http://localhost:13444/realms/dev"',
        '  clientId: "self-service"',
        'backendUrl: "http://localhost:13000"',
        `publicBaseUrl: "${PUBLIC_BASE_URL}"`,
        '',
      ].join('\n')
    );
    process.env.CONSOLE_CONFIG = configPath;
    __resetServerEnvCacheForTests();

    exchangeCodeMock.mockReset();
    // The route only needs `exchangeCode` to have been *called* with the right URL; how it settles
    // afterwards is irrelevant to this test, so reject cheaply rather than building a real session.
    exchangeCodeMock.mockRejectedValue(new Error('stub: exchangeCode is mocked in this test'));
  });

  afterEach(() => {
    if (originalConsoleConfig === undefined) delete process.env.CONSOLE_CONFIG;
    else process.env.CONSOLE_CONFIG = originalConsoleConfig;
    __resetServerEnvCacheForTests();
    rmSync(configDir, { recursive: true, force: true });
  });

  it('exchanges the code against the configured public origin, not the internal request origin', async () => {
    const { GET } = await import('./route');

    const sealedState = await sealAuthState(
      { state: 'the-state', codeVerifier: 'the-verifier', returnTo: '/' },
      SESSION_SECRET
    );

    const request = new NextRequest(
      `${INTERNAL_REQUEST_ORIGIN}/auth/callback?code=abc123&state=the-state`,
      { headers: { cookie: `${AUTH_STATE_COOKIE_NAME}=${sealedState}` } }
    );

    await GET(request);

    expect(exchangeCodeMock).toHaveBeenCalledTimes(1);
    const currentUrl = exchangeCodeMock.mock.calls[0]?.[0] as URL;

    // The essential property: the URL handed to the exchange must resolve to the *public* origin
    // regardless of what scheme/host the request itself arrived on internally.
    expect(currentUrl.origin).toBe(PUBLIC_BASE_URL);
    expect(currentUrl.origin).not.toBe(INTERNAL_REQUEST_ORIGIN);

    // The code/state query params are load-bearing for the exchange — rebuilding the origin must
    // not drop them.
    expect(currentUrl.pathname).toBe('/auth/callback');
    expect(currentUrl.searchParams.get('code')).toBe('abc123');
    expect(currentUrl.searchParams.get('state')).toBe('the-state');
  });
});
