/**
 * Sign-out: a full-page navigation to `/auth/logout`, never a `fetch`.
 *
 * `/auth/logout` (`apps/console/src/app/auth/logout/route.ts`) is an RP-initiated Keycloak
 * logout -- it 307-redirects the browser on to Keycloak's `end_session_endpoint` (or straight to
 * `/auth/signed-out` if no session/redirect could be built). That redirect chain only works as a
 * top-level navigation; an XHR/`fetch` would follow the redirect in the background and never move
 * the browser, leaving the user looking signed-out locally while Keycloak's own SSO session (and
 * any other app sharing it) stays live.
 */
export function signOut() {
  window.location.assign('/auth/logout');
}
