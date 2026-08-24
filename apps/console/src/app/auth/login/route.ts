import { NextResponse, type NextRequest } from 'next/server';

import { publicOrigin, serverEnv } from '../../../server/env';
import { buildAuthorizationRequest } from '../../../server/oidc';
import { sanitizeReturnTo } from '../../../server/return-to';
import { AUTH_STATE_COOKIE_NAME, sealAuthState } from '../../../server/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The transient login cookie only has to survive the round trip to Keycloak. */
const AUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export function callbackRedirectUri(request: NextRequest): string {
  return `${publicOrigin(request)}/auth/callback`;
}

/**
 * Starts Authorization Code + PKCE. The `state` and the PKCE `code_verifier` go into their own
 * short-lived `httpOnly` cookie rather than into the session cookie — there is no session yet, and
 * the verifier must never be readable by page JavaScript or it stops being proof of possession.
 */
export async function GET(request: NextRequest) {
  const env = serverEnv();
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('returnTo'));

  let authorization;
  try {
    authorization = await buildAuthorizationRequest(callbackRedirectUri(request), env);
  } catch (error) {
    console.error('[console] Failed to build the authorization request:', error);
    return NextResponse.redirect(new URL('/auth/error?reason=discovery', publicOrigin(request)));
  }

  const sealedState = await sealAuthState(
    {
      state: authorization.state,
      codeVerifier: authorization.codeVerifier,
      returnTo,
    },
    env.sessionSecret
  );

  const response = NextResponse.redirect(authorization.authorizationUrl);
  response.cookies.set(AUTH_STATE_COOKIE_NAME, sealedState, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
