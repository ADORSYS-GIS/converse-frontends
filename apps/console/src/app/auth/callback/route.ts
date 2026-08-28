import { NextResponse, type NextRequest } from 'next/server';

import { publicOrigin, serverEnv } from '../../../server/env';
import { AudienceError, exchangeCode } from '../../../server/oidc';
import { sanitizeReturnTo } from '../../../server/return-to';
import { AUTH_STATE_COOKIE_NAME, newSessionId, openAuthState } from '../../../server/session';
import { writeSession } from '../../../server/session-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function failure(request: NextRequest, reason: string, detail?: string): NextResponse {
  const url = new URL('/auth/error', publicOrigin(request));
  url.searchParams.set('reason', reason);
  if (detail) url.searchParams.set('detail', detail.slice(0, 140));
  const response = NextResponse.redirect(url);
  response.cookies.set(AUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}

/** The provider's `error_description`, when the thrown error carries one (openid-client's
 * `ResponseBodyError` does). Rendered on /auth/error behind a strict sanitizer — without this,
 * a real IdP message like "Offline tokens not allowed for the user or client" dies in the server
 * log while the page shows only a generic sentence. */
function providerDetail(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'error_description' in error) {
    const description = (error as { error_description?: unknown }).error_description;
    if (typeof description === 'string') return description;
  }
  return undefined;
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
    const description = request.nextUrl.searchParams.get('error_description') ?? undefined;
    console.error('[console] Authorization response carried an error:', providerError, description);
    return failure(request, providerError, description);
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
  //
  // Critically, the *origin* of that rebuilt URL must be the public one (`origin`, computed above
  // from `publicOrigin(request)`), not `request.url`'s own origin. Behind a TLS-terminating proxy
  // (Traefik in this deployment), `request.url` reflects the internal hop into the Next.js
  // process — `http://` and/or an internal host — never what the browser and Keycloak agreed on
  // at the authorize step. `openid-client` v6's `authorizationCodeGrant` derives the token
  // request's `redirect_uri` straight from this URL's origin+pathname, so a mismatch here is
  // exactly what Keycloak's exchange endpoint rejects as "Incorrect redirect_uri" — `/auth/login`
  // already gets this right via the same `publicOrigin(request)` call. Only the path and query
  // (which carry `code`/`state`) come from the incoming request.
  const incomingUrl = new URL(request.url);
  const currentUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, origin);

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
    return failure(request, 'exchange', providerDetail(error));
  }
}
