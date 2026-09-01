import { type NextRequest, NextResponse } from 'next/server';
import * as client from 'openid-client';

import {
  cookieOptions,
  PKCE_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  STATE_COOKIE,
} from '../../../../lib/auth';
import { getOidc } from '../../../../lib/auth/oidc';

export const runtime = 'nodejs';

/** Handle the IdP redirect back: exchange the code for tokens and set the session cookie. */
export async function GET(req: NextRequest) {
  const { config, clientConfig } = await getOidc();
  const appOrigin = new URL(clientConfig.redirectUri).origin;

  const codeVerifier = req.cookies.get(PKCE_COOKIE)?.value;
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  if (!codeVerifier || !expectedState) {
    return NextResponse.redirect(new URL('/sign-in?error=missing_state', appOrigin));
  }

  const callbackUrl = new URL(clientConfig.redirectUri);
  callbackUrl.search = new URL(req.url).search;

  let tokens: client.TokenEndpointResponse;
  try {
    tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
    });
  } catch {
    return NextResponse.redirect(new URL('/sign-in?error=exchange_failed', appOrigin));
  }

  const maxAge = typeof tokens.expires_in === 'number' ? tokens.expires_in : 1800;

  const res = NextResponse.redirect(new URL('/', appOrigin));
  res.cookies.set(SESSION_COOKIE, tokens.access_token, cookieOptions(maxAge));

  if (tokens.refresh_token) {
    const refreshMaxAge =
      typeof tokens.refresh_expires_in === 'number' && tokens.refresh_expires_in > 0
        ? tokens.refresh_expires_in
        : 30 * 24 * 60 * 60;
    res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(refreshMaxAge));
  }

  res.cookies.delete(PKCE_COOKIE);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
