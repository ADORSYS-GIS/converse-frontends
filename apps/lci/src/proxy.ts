import { type NextRequest, NextResponse } from 'next/server';

import {
  appBaseUrl,
  cookieOptions,
  oidcClientConfigFromEnv,
  refreshOnce,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  verifyAccessToken,
  verifyConfigFromEnv,
} from './lib/auth';

// Protect every route except /auth/* — login, callback, logout, and the callback's own failure
// landing, all reachable with no session by definition — robots.txt (a Next metadata route with
// no session dependency — a liveness/readiness probe target), the brand-mark images (must render
// in chrome that's visible before, and without, a session), the PWA manifest and its icons, and
// the service worker route (a fetch with no session at all; must never be answered with a login
// redirect). There is no separate "click to sign in" page to exempt: every other unauthenticated
// request already redirects straight to /auth/login below. `/api/*` otherwise (the control-plane
// data proxies) stays fully gated — only the `auth` segment is exempt, not the whole `api` prefix.
//
// Each alternative is followed by `(?:/|$)` so a prefix only exempts itself, not anything that
// merely starts with the same letters (`/brandingx`, `/authenticate` would otherwise slip through
// unprotected). Edge-safe: only `jose` and fetch.
export const config = {
  matcher: [
    '/((?!(?:auth|branding|serwist|manifest\\.json|icons|_next/static|_next/image|favicon\\.ico|robots\\.txt)(?:/|$)).*)',
  ],
};

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyAccessToken(token, verifyConfigFromEnv()) : null;

  if (!claims) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

    if (refreshToken) {
      const refreshed = await refreshOnce(refreshToken, oidcClientConfigFromEnv());

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

      const res = NextResponse.redirect(new URL('/auth/login', appBaseUrl()));
      res.cookies.delete(SESSION_COOKIE);
      // Not deleted here: a concurrent refresh race in another tab may have already set a new
      // valid one.
      return res;
    }

    const res = NextResponse.redirect(new URL('/auth/login', appBaseUrl()));
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  return NextResponse.next();
}
