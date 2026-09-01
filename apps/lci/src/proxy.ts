import { type NextRequest, NextResponse } from 'next/server';

import {
  appBaseUrl,
  cookieOptions,
  oidcClientConfigFromEnv,
  performRefreshGrant,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  verifyAccessToken,
  verifyConfigFromEnv,
} from './lib/auth';

// Protect every route except /sign-in and the auth API itself. Edge-safe: only `jose` and fetch.
export const config = {
  matcher: ['/((?!sign-in|api/auth|_next/static|_next/image|favicon.ico).*)'],
};

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyAccessToken(token, verifyConfigFromEnv()) : null;

  if (!claims) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

    if (refreshToken) {
      const refreshed = await performRefreshGrant(refreshToken, oidcClientConfigFromEnv());

      if (refreshed.ok) {
        const res = NextResponse.next();
        res.cookies.set(
          SESSION_COOKIE,
          refreshed.data.accessToken,
          cookieOptions(refreshed.data.expiresIn)
        );
        if (refreshed.data.refreshToken) {
          const refreshMaxAge = refreshed.data.refreshExpiresIn ?? 30 * 24 * 60 * 60;
          res.cookies.set(
            REFRESH_COOKIE,
            refreshed.data.refreshToken,
            cookieOptions(refreshMaxAge)
          );
        }
        return res;
      }

      const res = NextResponse.redirect(new URL('/api/auth/login', appBaseUrl()));
      res.cookies.delete(SESSION_COOKIE);
      // Not deleted here: a concurrent refresh race in another tab may have already set a new
      // valid one — same reasoning as lightbridge-code-intelligence's own proxy.ts.
      return res;
    }

    const res = NextResponse.redirect(new URL('/api/auth/login', appBaseUrl()));
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  return NextResponse.next();
}
