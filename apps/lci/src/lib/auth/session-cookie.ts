/** Name of the httpOnly cookie holding the OIDC access token (the browser's session handle). */
export const SESSION_COOKIE = 'lci_session';
export const REFRESH_COOKIE = 'lci_refresh';

/** Short-lived cookies that carry PKCE/state across the authorization redirect. */
export const PKCE_COOKIE = 'lci_pkce';
export const STATE_COOKIE = 'lci_state';

export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

/** httpOnly always (no JS access); `Secure` in production; `SameSite=Lax` so the cookie survives
 *  the IdP redirect back to us. */
export function cookieOptions(maxAgeSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
