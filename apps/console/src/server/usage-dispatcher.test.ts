import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConsoleEnv } from './env';
import { resetUsageDispatcherForTests, usageDispatcher } from './usage-dispatcher';

/**
 * The usage backend's query listener requires a client certificate and has no bearer-token auth of
 * its own (lightbridge-authz#347/#361), so this module is the console's only way to reach it.
 *
 * The properties that matter, in order of how much damage their absence does:
 *
 * 1. **Unconfigured yields nothing.** Every other backend the console talks to must NOT receive a
 *    client certificate; the console only holds one because one service asked for it. If this
 *    returned a dispatcher by default, that identity would start travelling to authz-idp and
 *    authz-api too.
 * 2. **A half-configured block counts as unconfigured.** A cert without a key cannot produce a
 *    working TLS identity, so accepting one would turn a config typo into a per-request handshake
 *    failure instead of the same honest 503 an unconfigured deployment already gets.
 * 3. **An unreadable cert does not throw.** Every other console screen works without the usage
 *    backend. A missing file must degrade this one route, not crash the process on boot.
 */

function envWith(usageClientCert?: ConsoleEnv['usageClientCert']): ConsoleEnv {
  return {
    idp: {
      issuer: 'https://idp.example.test',
      clientId: 'console',
      scopes: 'openid',
      expectedAudiences: ['console'],
      audienceRequired: true,
      rolesClaim: 'lightbridge_api_roles',
    },
    backendUrl: 'https://api.example.test',
    apiBasePath: '',
    budgetUrl: 'https://budget.example.test',
    usageUrl: 'https://usage.example.test',
    sessionSecret: 'x'.repeat(48),
    usageClientCert,
  };
}

/** A syntactically valid PEM pair is not needed: undici only reads the bytes at connect time. */
function certFixture(): { certPath: string; keyPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'console-usage-cert-'));
  const certPath = join(dir, 'tls.crt');
  const keyPath = join(dir, 'tls.key');
  writeFileSync(certPath, '-----BEGIN CERTIFICATE-----\nnot-a-real-cert\n-----END CERTIFICATE-----\n');
  writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n');
  return { certPath, keyPath };
}

afterEach(() => {
  resetUsageDispatcherForTests();
  vi.restoreAllMocks();
});

describe('usageDispatcher', () => {
  it('yields no dispatcher when no client certificate is configured', () => {
    expect(usageDispatcher(envWith(undefined))).toBeUndefined();
  });

  it('builds a dispatcher when a cert and key are both readable', () => {
    expect(usageDispatcher(envWith(certFixture()))).toBeDefined();
  });

  it('caches the agent rather than re-reading the files per request', () => {
    const env = envWith(certFixture());
    expect(usageDispatcher(env)).toBe(usageDispatcher(env));
  });

  /**
   * The failure mode this guards: a boot loop. `readFileSync` throwing out of a module imported by
   * every route would take the whole console down over one absent file.
   */
  it('logs and yields nothing when the certificate cannot be read, without throwing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dispatcher = usageDispatcher(
      envWith({ certPath: '/nonexistent/tls.crt', keyPath: '/nonexistent/tls.key' })
    );
    expect(dispatcher).toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });

  it('does not retry a failed load on every call', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = envWith({ certPath: '/nonexistent/tls.crt', keyPath: '/nonexistent/tls.key' });
    usageDispatcher(env);
    usageDispatcher(env);
    expect(error).toHaveBeenCalledOnce();
  });
});
