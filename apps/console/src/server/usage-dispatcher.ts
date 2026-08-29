import { readFileSync } from 'node:fs';

import { Agent, type Dispatcher } from 'undici';

import { type ConsoleEnv, serverEnv } from './env';

/**
 * The mTLS client identity the console presents to the usage backend's query listener.
 *
 * The usage service splits its TLS surface in two (lightbridge-authz#347/#361): an *ingest*
 * listener that stays unauthenticated because its caller is an OpenTelemetry exporter that cannot
 * be given a certificate, and a *query* listener that **requires and verifies a client
 * certificate**. The query API has no bearer-token auth of its own -- the client certificate IS
 * the authentication. So there is no "just send the access token" path: without a cert the
 * connection is refused at the TLS handshake, before any HTTP exists to carry a token.
 *
 * That is why this exists at all, and why it is not a workaround. What it authenticates is "a
 * legitimate lightbridge workload holding a CA-signed cert", which is exactly what the console is.
 *
 * Two things this deliberately does NOT do:
 *
 * - It does not disable verification anywhere. The cert/key here are what the console *presents*;
 *   what it *trusts* comes from `NODE_EXTRA_CA_CERTS`, set alongside this in the deployment. Both
 *   directions stay verified.
 * - It is not installed as the global dispatcher. Only the two usage call sites opt in, so the
 *   console never presents a client certificate to authz-idp, authz-api or anything else. A
 *   workload identity should travel to exactly the service that asked for it.
 *
 * Unconfigured is a first-class state, not an error: a deployment without `usageClientCert` simply
 * gets `undefined` and the usage routes answer their honest `503`, exactly as before this existed.
 */

/**
 * `undefined` = not configured. Cached for the process lifetime because the underlying files
 * cannot change without a restart (they are a projected Secret volume, and Node reads
 * `NODE_EXTRA_CA_CERTS` once at startup for the same reason).
 *
 * `null` distinguishes "we tried and it failed" from "not yet attempted", so a broken cert is
 * logged once rather than on every request.
 */
let cached: Agent | null | undefined;

function build(config: NonNullable<ConsoleEnv['usageClientCert']>): Agent | null {
  try {
    const cert = readFileSync(config.certPath);
    const key = readFileSync(config.keyPath);
    return new Agent({ connect: { cert, key } });
  } catch (error) {
    // Loud, once, and non-fatal. A missing or unreadable cert must not take the whole console
    // down -- every other screen works without the usage backend, and the usage routes already
    // have an honest failure mode. Answering 502/503 there beats a boot loop everywhere.
    console.error(
      `[console] Failed to load the usage client certificate from ${config.certPath} / ${config.keyPath}:`,
      error
    );
    return null;
  }
}

/**
 * The dispatcher to hand `fetch` for a usage-backend call, or `undefined` when this deployment
 * has no client certificate configured.
 */
export function usageDispatcher(env: ConsoleEnv = serverEnv()): Dispatcher | undefined {
  if (!env.usageClientCert) {
    return undefined;
  }
  if (cached === undefined) {
    cached = build(env.usageClientCert);
  }
  return cached ?? undefined;
}

/** Test seam: drops the cached agent so a test can vary the configuration. */
export function resetUsageDispatcherForTests(): void {
  cached = undefined;
}
