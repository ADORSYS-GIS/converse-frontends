import { NextResponse, type NextRequest } from 'next/server';

import { publicOrigin, serverEnv } from '../../../server/env';
import { AudienceError, exchangeCode } from '../../../server/oidc';
import { sanitizeReturnTo } from '../../../server/return-to';
import { AUTH_STATE_COOKIE_NAME, newSessionId, openAuthState } from '../../../server/session';
import { writeSession } from '../../../server/session-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function failure(request: NextRequest, reason: string): NextResponse {
  const url = new URL('/auth/error', publicOrigin(request));
  url.searchParams.set('reason', reason);
  const response = NextResponse.redirect(url);
  response.cookies.set(AUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}

/**
 * Completes the code exchange server-side and establishes the cookie session.
 *
 * The `state` check is delegated to `openid-client`'s `expectedState`, fed from the sealed
 * login-state cookie — so a callback that arrives without that cookie, or with a `state` that does
 * not match it, is rejected before any token request goes out.
 */
export async function GET(request: NextRequest) {
  const env = serverEnv();
  const origin = publicOrigin(request);

  const providerError = request.nextUrl.searchParams.get('error');
  if (providerError) {
    console.error('[console] Authorization response carried an error:', providerError);
    return failure(request, providerError);
  }

  const sealedState = request.cookies.get(AUTH_STATE_COOKIE_NAME)?.value;
  if (!sealedState) {
    return failure(request, 'missing_state');
  }

  const authState = await openAuthState(sealedState, env.sessionSecret);
  if (!authState) {
    return failure(request, 'invalid_state');
  }

  // `request.nextUrl` carries Next's own internal search params on some paths; rebuild a clean URL
  // from the incoming href so `openid-client` sees exactly what the provider redirected to.
  const currentUrl = new URL(request.url);

  try {
    const session = await exchangeCode(
      currentUrl,
      { expectedState: authState.state, pkceCodeVerifier: authState.codeVerifier },
      newSessionId(),
      env
    );

    const response = NextResponse.redirect(new URL(sanitizeReturnTo(authState.returnTo), origin));
    response.cookies.set(AUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    await writeSession(response, session);
    return response;
  } catch (error) {
    if (error instanceof AudienceError) {
      console.error('[console] Audience validation failed on login:', error.errors);
      return failure(request, 'audience');
    }
    console.error('[console] Authorization code exchange failed:', error);
    return failure(request, 'exchange');
  }
}
