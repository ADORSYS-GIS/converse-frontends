import * as client from 'openid-client';

import { type OidcClientConfig, oidcClientConfigFromEnv } from './oidc-config';

let cached: { config: client.Configuration; clientConfig: OidcClientConfig } | null = null;

/**
 * Discover the OIDC provider (Keycloak in dev) and build the openid-client Configuration.
 *
 * Node runtime ONLY — `openid-client` is not Edge-safe. Token *validation* (`proxy.ts`) uses
 * `jose` instead; this is only for the Authorization-Code exchange in the route handlers.
 * Cached per server instance so discovery runs once.
 */
export async function getOidc() {
  if (cached) return cached;
  const clientConfig = oidcClientConfigFromEnv();
  const issuerUrl = new URL(clientConfig.issuer);
  // openid-client refuses non-HTTPS issuers by default. Allow http ONLY for local dev.
  const options =
    issuerUrl.protocol === 'http:' ? { execute: [client.allowInsecureRequests] } : undefined;
  const config = await client.discovery(
    issuerUrl,
    clientConfig.clientId,
    clientConfig.clientSecret,
    clientConfig.clientSecret ? undefined : client.None(),
    options
  );
  cached = { config, clientConfig };
  return cached;
}
