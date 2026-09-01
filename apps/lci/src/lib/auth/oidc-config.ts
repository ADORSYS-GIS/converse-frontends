/**
 * Config for the OIDC Authorization-Code (+PKCE) flow. Kept free of any `openid-client` import so
 * this module stays usable from Edge code (`proxy.ts`); the flow itself lives in the Node-runtime
 * route handlers. Ported from `@lightbridge/auth` — see `claims.ts`'s doc comment.
 */
export interface OidcClientConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
}

function required(name: string): string {
  // eslint-disable-next-line expo/no-dynamic-env-var -- same pattern apps/console/src/server/config-loader.ts uses; this reads one of a small fixed set of OIDC_* names, never user input.
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export function oidcClientConfigFromEnv(): OidcClientConfig {
  return {
    issuer: required('OIDC_ISSUER').replace(/\/+$/, ''),
    clientId: required('OIDC_CLIENT_ID'),
    clientSecret: process.env.OIDC_CLIENT_SECRET || undefined,
    redirectUri: process.env.OIDC_REDIRECT_URI ?? 'http://localhost:3001/api/auth/callback',
    postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI ?? 'http://localhost:3001',
    scope: process.env.OIDC_SCOPE ?? 'openid profile email',
  };
}

/** The OIDC token endpoint URL, used for refresh grants. Edge-safe. */
export function oidcTokenUri(issuer: string): string {
  return (
    process.env.OIDC_TOKEN_URI ?? `${issuer.replace(/\/+$/, '')}/protocol/openid-connect/token`
  );
}

/** This app's public origin, derived from `OIDC_REDIRECT_URI` — used for app-relative redirects
 *  instead of the request URL, which is unreliable behind an ingress. Edge-safe (env only). */
export function appBaseUrl(): string {
  const source = process.env.OIDC_REDIRECT_URI ?? process.env.OIDC_POST_LOGOUT_REDIRECT_URI;
  if (!source) {
    throw new Error('OIDC_REDIRECT_URI (or OIDC_POST_LOGOUT_REDIRECT_URI) must be set');
  }
  return new URL(source).origin;
}
