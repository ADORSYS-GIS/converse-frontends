import { NextResponse, type NextRequest } from 'next/server';

import { chunkCookieName } from './server/cookie-names';

/**
 * `/<legacy path>[?account=<id>]` -> `/accounts/<id>/<segment>[?<other params>]` (IA v3 phase 1,
 * "account into the path") — every screen now lives under `/accounts/[accountId]/*`, so every
 * pre-existing deep link (bookmarked, linked from a ticket, minted by an old email) needs a
 * standing redirect rather than a 404.
 *
 * `account` is always stripped from the query string once resolved into the path segment it now
 * is; every OTHER param (`?status=active`, `?row=proj_1`, …) survives verbatim onto the target —
 * this table only ever touches `account`/`next`, nothing a screen's own `url-state.ts` parser
 * owns. `null` return means "not a legacy link this table covers" — including a bare `/` with no
 * `?account=` (already IS the resolver, `app/(console)/page.tsx`).
 *
 * IA v3 phase 2 ("the settings area") is what `/admin`/`/settings/account`/`/settings/projects`'s
 * own redirects (`LEGACY_STATIC_REDIRECT`, below) are for — those three paths never carried an
 * `?account=` of their own, so they get a simpler table rather than being folded into this one.
 *
 * IA v3 phase E ("the settings/accounts move") is what `/accounts/<id>/{projects,refill}`'s own
 * redirect (`ACCOUNT_SCOPED_PATH_MOVE`, below) is for — a third shape again: the account id is
 * already IN the old path (this table's own job is extracting it OUT of `?account=`), so it needs
 * its own regex-captured table rather than folding into either of the other two.
 */
const LEGACY_ACCOUNT_SCOPED_SEGMENT: Record<string, 'overview' | 'projects' | 'api-keys'> = {
  '/': 'overview',
  '/projects': 'projects',
  '/api-keys': 'api-keys',
};

/**
 * IA v3 phase 2's three path moves — exact-pathname, query-string-preserved-verbatim redirects,
 * unlike `LEGACY_ACCOUNT_SCOPED_SEGMENT` above (none of these three ever carried an `?account=`
 * segment of their own to extract):
 *
 *  - `/settings/projects` -> `/settings/policies`: project settings folded into the combined
 *    account/project policies screen. `?row=`/`?rename=`/`?q=`/`?page=` survive verbatim —
 *    `use-policies-screen.ts` reads `useSettingsParams()`, the same parser `/settings/projects`
 *    used.
 *  - `/settings/account` -> `/?next=overview`: account identity moved into the inspector rail's
 *    standing quick-settings panel (`/`'s own Overview screen), which has no path-addressable
 *    equivalent of "look at this specific account's settings" the way `/accounts/<id>/*` does —
 *    middleware has no account id to route through (it never decrypts the session, see
 *    `middleware()`'s own doc comment), so this lands on the account resolver instead of a
 *    specific account. `?account-name=true` (the old rename-dialog trigger) is dropped along with
 *    everything else the old route owned — the rename dialog opens from the rail now, not a URL
 *    flag — but any OTHER param survives, same "touch only what this move actually changes" rule
 *    the account-scoped table above follows.
 *
 * ADR 0013's same-day "the admin area" amendment adds a fourth, of the identical shape:
 *
 *  - `/settings/refills-queue` -> `/admin/refills-queue`: the budget refill review queue moved a
 *    SECOND time — `/admin` (pre-IA-v3) -> `/settings/refills-queue` (IA v3 phase 2, the row
 *    above until this amendment) -> `/admin/refills-queue` (here). `/admin` itself is a LIVE route
 *    again (the operator dashboard, `/admin/overview`), so the old `/admin` -> `/settings/
 *    refills-queue` row is retired rather than updated — nothing should still 308 off the bare
 *    `/admin` segment now that it resolves to real content of its own
 *    (`app/(console)/admin/page.tsx`'s own `redirect('/admin/overview')`). `?request=req_9` and
 *    every other param survive verbatim, same as every other row here.
 */
const LEGACY_STATIC_REDIRECT: Record<string, string> = {
  '/settings/projects': '/settings/policies',
  '/settings/account': '/',
  '/settings/refills-queue': '/admin/refills-queue',
};

function legacyStaticRedirectTarget(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  const target = LEGACY_STATIC_REDIRECT[pathname];
  if (target === undefined) return null;

  if (target === '/') {
    const remaining = new URLSearchParams(searchParams);
    remaining.delete('account-name');
    remaining.set('next', 'overview');
    return `/?${remaining.toString()}`;
  }

  const query = searchParams.toString();
  return `${target}${query ? `?${query}` : ''}`;
}

/**
 * IA v3 phase E ("the settings/accounts move") — two more path moves, distinct from BOTH tables
 * above: the account id is already IN the old path (unlike `LEGACY_ACCOUNT_SCOPED_SEGMENT`, which
 * extracts it out of `?account=`), and the target keeps that same id (unlike
 * `LEGACY_STATIC_REDIRECT`, which is exact-pathname, no captured segment). Query strings survive
 * verbatim onto the target, same rule as every other row in this file — this is what keeps
 * `/accounts/A/refill?project=proj_1` landing on `/settings/accounts/A/request-refill?project=
 * proj_1`, the exact param `use-console-scope.ts`'s `projectScopeParsers` already owns on the new
 * path too.
 *
 *  - `/accounts/<id>/projects` -> `/settings/accounts/<id>/projects`: the projects ledger moved
 *    wholesale (owner: "We will move /projects to /settings/accounts/<account-id>/projects too").
 *  - `/accounts/<id>/refill` -> `/settings/accounts/<id>/request-refill`: the refill request flow
 *    moved with it (owner: "refill must be account scoped" — it already was; this just relocates
 *    it under the new account-settings tree alongside its sibling).
 */
const ACCOUNT_SCOPED_PATH_MOVE: { pattern: RegExp; target: (accountId: string) => string }[] = [
  {
    pattern: /^\/accounts\/([^/]+)\/projects$/,
    target: (accountId) => `/settings/accounts/${accountId}/projects`,
  },
  {
    pattern: /^\/accounts\/([^/]+)\/refill$/,
    target: (accountId) => `/settings/accounts/${accountId}/request-refill`,
  },
];

function legacyAccountScopedPathMoveTarget(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  for (const { pattern, target } of ACCOUNT_SCOPED_PATH_MOVE) {
    const match = pathname.match(pattern);
    if (match) {
      const query = searchParams.toString();
      return `${target(match[1])}${query ? `?${query}` : ''}`;
    }
  }
  return null;
}

export function legacyRedirectTarget(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  const staticTarget = legacyStaticRedirectTarget(pathname, searchParams);
  if (staticTarget) return staticTarget;

  const pathMoveTarget = legacyAccountScopedPathMoveTarget(pathname, searchParams);
  if (pathMoveTarget) return pathMoveTarget;

  const segment = LEGACY_ACCOUNT_SCOPED_SEGMENT[pathname];
  if (segment === undefined) return null;

  const remaining = new URLSearchParams(searchParams);
  const accountId = remaining.get('account');
  remaining.delete('account');

  if (accountId) {
    // Meaningless once the account is a path segment — an old `/?account=A&next=projects` link
    // would otherwise survive as a dead param on `/accounts/A/overview`.
    remaining.delete('next');
    const query = remaining.toString();
    return `/accounts/${accountId}/${segment}${query ? `?${query}` : ''}`;
  }

  // A bare `/` with no `?account=` is already the resolver itself — nothing to redirect.
  if (pathname === '/') return null;

  remaining.set('next', segment);
  return `/?${remaining.toString()}`;
}

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
    // The legacy-deep-link redirect table runs only for an authenticated visitor — an
    // unauthenticated one is about to be sent to `/auth/login` below regardless, and rewriting
    // `returnTo` here would be solving a problem the login flow doesn't have.
    const target = legacyRedirectTarget(request.nextUrl.pathname, request.nextUrl.searchParams);
    if (target) {
      return NextResponse.redirect(new URL(target, request.url), 308);
    }
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
     *                        `api/*` and `auth/*` are also the two families the service worker must
     *                        never cache; that list lives in `src/shared/uncacheable-paths.ts` and
     *                        `middleware.test.ts` asserts this matcher stays consistent with it.
     *                        It cannot be imported here — Next extracts `config` by static AST
     *                        analysis, and an imported identifier yields no matcher at all.
     *   .well-known/*      — public discovery metadata (RFC 9728)
     *   serwist/*          — the service worker route (`src/app/serwist/[path]/route.ts`, backed by
     *                        `@serwist/turbopack`'s `createSerwistRoute`), serving `/serwist/sw.js`
     *                        and its sourcemap; a service-worker fetch carries no session and must
     *                        never be answered with a login redirect. Replaces the old `sw.js` /
     *                        `swe-worker-*` prefixes that matched `@serwist/next`'s webpack-emitted
     *                        `public/sw.js`, which no longer exists.
     *   branding/*         — issue #368 (Phase H, runtime white-label branding): `/branding/logo`
     *                        and `/branding/override.css` (`src/app/branding/*`). Both back chrome
     *                        that must render before/without a session (the root layout's `<link>`
     *                        and the sidebar/top-bar brand mark), same reasoning as `serwist/*`.
     *   _next/*            — build output
     *   manifest.json, icons/*, favicon.ico            — public static assets
     *   robots.txt, sitemap.xml — Next.js metadata routes (app/robots.ts, app/sitemap.ts);
     *                              the console is internal-only and disallows every crawler, but
     *                              the documents that say so must themselves be servable to an
     *                              unauthenticated crawler, not gated behind a login redirect
     */
    '/((?!api/|auth/|\\.well-known/|_next/|serwist/|branding/|manifest\\.json|icons/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
