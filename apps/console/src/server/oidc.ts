import * as client from 'openid-client';

import { fetchMyAccess, type MyAccessSnapshot } from './access';
import { serverEnv, type ConsoleEnv } from './env';
import type { ConsoleSession, SessionTokens } from './session';
import { buildSessionUser, checkAudience, extractRoles } from './tokens';

/**
 * The whole OIDC lifecycle, executed server-side (ADR 0009 Decision 2). Discovery, PKCE, the code
 * exchange, refresh and RP-initiated logout all happen here; the browser only ever sees redirects
 * and a cookie.
 */

/** Raised when a token's `aud` does not satisfy `EXPECTED_AUDIENCES`. Always blocks the session. */
export class AudienceError extends Error {
  constructor(readonly errors: string[]) {
    super(`JWT audience validation failed: ${errors.join('; ')}`);
    this.name = 'AudienceError';
  }
}

let cachedConfig: { issuer: string; clientId: string; config: client.Configuration } | null = null;

/**
 * Discovers the issuer once per process. `allowInsecureRequests` is enabled **only** for a
 * plaintext-HTTP issuer outside production — that is the local compose Keycloak
 * (`http://localhost:13444/realms/lightbridge-dev`). A production deploy pointing at an `http://`
 * issuer fails here rather than silently sending credentials in the clear.
 */
export async function oidcConfig(env: ConsoleEnv = serverEnv()): Promise<client.Configuration> {
  const { issuer, clientId, clientSecret } = env.idp;
  if (cachedConfig && cachedConfig.issuer === issuer && cachedConfig.clientId === clientId) {
    return cachedConfig.config;
  }

  const issuerUrl = new URL(issuer);
  const insecure = issuerUrl.protocol === 'http:';
  if (insecure && process.env.NODE_ENV === 'production') {
    throw new Error(
      `[console] Refusing to use a plaintext-HTTP KEYCLOAK_ISSUER (${issuer}) in production`
    );
  }

  const config = await client.discovery(
    issuerUrl,
    clientId,
    clientSecret ? { client_secret: clientSecret } : undefined,
    clientSecret ? client.ClientSecretPost(clientSecret) : client.None(),
    insecure ? { execute: [client.allowInsecureRequests] } : undefined
  );

  cachedConfig = { issuer, clientId, config };
  return config;
}

export type AuthorizationRequest = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
};

export async function buildAuthorizationRequest(
  redirectUri: string,
  env: ConsoleEnv = serverEnv()
): Promise<AuthorizationRequest> {
  const config = await oidcConfig(env);
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const authorizationUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: env.idp.scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  return { authorizationUrl: authorizationUrl.href, state, codeVerifier };
}

function toSessionTokens(
  response: client.TokenEndpointResponseHelpers & {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  },
  audience: string[] | undefined,
  now: number
): SessionTokens {
  const expiresIn = response.expiresIn();
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    idToken: response.id_token,
    expiresAt: expiresIn === undefined ? undefined : now + expiresIn * 1000,
    audience,
  };
}

/**
 * Exchanges the authorization code and validates the audience **before** a session exists.
 * A mismatch throws — mirroring `use-keycloak-login.ts`, which blocks authentication rather than
 * warning, because a token minted for a different audience is not a token for this app.
 */
export async function exchangeCode(
  currentUrl: URL,
  checks: { expectedState: string; pkceCodeVerifier: string },
  sid: string,
  env: ConsoleEnv = serverEnv()
): Promise<ConsoleSession> {
  const config = await oidcConfig(env);
  const tokenResponse = await client.authorizationCodeGrant(config, currentUrl, {
    expectedState: checks.expectedState,
    pkceCodeVerifier: checks.pkceCodeVerifier,
  });

  const accessToken = tokenResponse.access_token;
  const audienceCheck = checkAudience(
    accessToken,
    env.idp.expectedAudiences,
    env.idp.audienceRequired
  );
  if (!audienceCheck.valid) {
    throw new AudienceError(audienceCheck.errors);
  }

  let userInfo: client.UserInfoResponse | undefined;
  const subject = tokenResponse.claims()?.sub;
  try {
    userInfo = await client.fetchUserInfo(config, accessToken, subject ?? client.skipSubjectCheck);
  } catch {
    // `/userinfo` is a nicety — the access token already carries `sub`, `name` and `email` in this
    // realm. A failure here must not cost the user their login.
    userInfo = undefined;
  }

  // `getMyAccess` with the token that was just minted (converse-frontends#452): the session is
  // built ONCE per login and carries the server's own permission answer from that moment on, so
  // no screen and no nav row ever re-derives authorization from a claim. A failure here does not
  // block the login — it produces the fail-closed unverified snapshot, and the chrome says so.
  const access = await fetchMyAccess(
    accessToken,
    extractRoles(accessToken, env.idp.rolesClaim, env.idp.clientId)
  );

  const user = buildSessionUser(
    accessToken,
    env.idp.rolesClaim,
    access,
    env.idp.clientId,
    userInfo
  );
  if (!user) {
    throw new Error('[console] Access token carries no subject; refusing to create a session');
  }

  return {
    sid,
    tokens: toSessionTokens(tokenResponse, audienceCheck.audience, Date.now()),
    user,
  };
}

/**
 * Performs the refresh-token grant and re-validates the audience — the same "validate on login AND
 * on refresh" rule `refreshAccessToken()` enforces today. Returns `null` on any failure so the
 * caller can treat "refresh failed" uniformly (clear cookie, answer 401) without catching.
 *
 * It also re-asks `getMyAccess` with the freshly minted token, so the rotated session carries a
 * current permission set rather than the one login happened to see. A `getMyAccess` failure is NOT
 * a refresh failure: the tokens are valid, so the refresh succeeds and the returned snapshot is
 * the fail-closed unverified one.
 */
export async function refreshSession(
  session: ConsoleSession,
  env: ConsoleEnv = serverEnv()
): Promise<{ tokens: SessionTokens; access: MyAccessSnapshot } | null> {
  const refreshToken = session.tokens.refreshToken;
  if (!refreshToken) return null;

  try {
    const config = await oidcConfig(env);
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    const accessToken = tokenResponse.access_token;

    const audienceCheck = checkAudience(
      accessToken,
      env.idp.expectedAudiences,
      env.idp.audienceRequired
    );
    if (!audienceCheck.valid) {
      console.error('[console] Audience validation failed on refresh:', audienceCheck.errors);
      return null;
    }

    // Re-asked on every refresh, not carried over (converse-frontends#452): a grant or a
    // revocation lands in `platform_role_grants` and reaches the token at its next mint, so the
    // refresh is exactly the moment the console's own copy of "what may this caller do" must be
    // replaced rather than trusted. Re-using the previous answer would hold a revoked capability
    // open for as long as the browser kept refreshing.
    const access = await fetchMyAccess(
      accessToken,
      extractRoles(accessToken, env.idp.rolesClaim, env.idp.clientId)
    );

    return {
      tokens: toSessionTokens(tokenResponse, audienceCheck.audience, Date.now()),
      access,
    };
  } catch (error) {
    console.error('[console] Token refresh failed:', error);
    return null;
  }
}

/**
 * RP-initiated logout URL. `id_token_hint` identifies the SSO session to end; without it Keycloak
 * shows a confirmation screen. `post_logout_redirect_uri` must be registered on the client.
 */
export async function buildLogoutUrl(
  idToken: string | undefined,
  postLogoutRedirectUri: string,
  env: ConsoleEnv = serverEnv()
): Promise<string | null> {
  const config = await oidcConfig(env);
  if (!config.serverMetadata().end_session_endpoint) {
    return null;
  }
  const parameters: Record<string, string> = {
    client_id: env.idp.clientId,
    post_logout_redirect_uri: postLogoutRedirectUri,
  };
  if (idToken) {
    parameters.id_token_hint = idToken;
  }
  return client.buildEndSessionUrl(config, parameters).href;
}
