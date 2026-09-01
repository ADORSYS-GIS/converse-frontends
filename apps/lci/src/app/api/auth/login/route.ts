import { NextResponse } from 'next/server';
import * as client from 'openid-client';

import { cookieOptions, PKCE_COOKIE, STATE_COOKIE } from '../../../../lib/auth';
import { getOidc } from '../../../../lib/auth/oidc';

// openid-client is not Edge-safe.
export const runtime = 'nodejs';

/** Start the OIDC Authorization-Code + PKCE flow: redirect the user to Keycloak. */
export async function GET() {
  const { config, clientConfig } = await getOidc();

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const authorizationUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: clientConfig.redirectUri,
    scope: clientConfig.scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  const res = NextResponse.redirect(authorizationUrl.href);
  res.cookies.set(PKCE_COOKIE, codeVerifier, cookieOptions(600));
  res.cookies.set(STATE_COOKIE, state, cookieOptions(600));
  return res;
}
