import { NextResponse, type NextRequest } from 'next/server';

import { publicOrigin, serverEnv } from '../../../server/env';
import { buildLogoutUrl } from '../../../server/oidc';
import { clearSession, readSessionFromRequest } from '../../../server/session-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * RP-initiated logout: ends the Keycloak SSO session itself (not just this app's copy of the
 * tokens) via the discovered `end_session_endpoint`, with `id_token_hint` so Keycloak knows which
 * session to end without prompting.
 *
 * The local cookie is cleared unconditionally, on every path through this handler — a failure to
 * reach the IdP must never leave the user still logged in here.
 *
 * NOTE(keycloak): `post_logout_redirect_uri` has to be registered on the client under
 * "Valid post logout redirect URIs", otherwise Keycloak refuses the redirect.
 */
export async function GET(request: NextRequest) {
  const env = serverEnv();
  const origin = publicOrigin(request);
  const postLogoutRedirectUri = `${origin}/auth/signed-out`;

  const session = await readSessionFromRequest(request);

  let destination = postLogoutRedirectUri;
  try {
    const logoutUrl = await buildLogoutUrl(session?.tokens.idToken, postLogoutRedirectUri, env);
    if (logoutUrl) destination = logoutUrl;
  } catch (error) {
    console.error('[console] Failed to build the RP-initiated logout URL:', error);
  }

  const response = NextResponse.redirect(destination);
  clearSession(response);
  return response;
}
