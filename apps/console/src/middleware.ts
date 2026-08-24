import { NextResponse, type NextRequest } from 'next/server';

import { chunkCookieName } from './server/cookie-names';

/**
 * The app-route guard: no session cookie means no console.
 *
 * NOTE(next 16): the `middleware` file convention is deprecated in favour of `proxy`; `next build`
 * says so on every run. Kept as `middleware.ts` because that is what this scaffold was specified
 * against — renaming it (and re-verifying the matcher) is a follow-up, not a silent side effect of
 * this PR.
 *
 * It only checks for the **presence** of the first session chunk; it never decrypts. Two reasons.
 * First, middleware runs on the edge runtime, where `node:crypto`'s HKDF is unavailable. Second,
 * and more importantly, a middleware verdict is not a security boundary here — every route handler
 * that can act on a session decrypts it properly, and a forged cookie value simply fails to open
 * and yields `401` there. This check exists so an unauthenticated *navigation* lands on the login
 * flow instead of a blank shell.
 *
 * `/api/*` is deliberately NOT guarded here: an unauthenticated XHR must get the machine-readable
 * `401 {"error":"unauthenticated"}` its route handler returns, not a `302` to an HTML login page.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(chunkCookieName(0))) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/auth/login', request.url);
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (returnTo && returnTo !== '/') {
    loginUrl.searchParams.set('returnTo', returnTo);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   api/*              — route handlers answer 401 JSON themselves (see above)
     *   auth/*             — the login flow itself, plus the signed-out / error views
     *   .well-known/*      — public discovery metadata (RFC 9728)
     *   sw.js, swe-worker-*  — the generated service worker (`@serwist/next` emits both into
     *                          `public/`); a service-worker fetch carries no session and must
     *                          never be answered with a login redirect
     *   _next/*            — build output
     *   manifest.json, icons/*, favicon.ico, robots.txt — public static assets
     */
    '/((?!api/|auth/|\\.well-known/|_next/|sw\\.js|swe-worker-|manifest\\.json|icons/|favicon\\.ico|robots\\.txt).*)',
  ],
};
