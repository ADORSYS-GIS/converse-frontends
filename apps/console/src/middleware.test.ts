import { describe, expect, it } from 'vitest';

import { config, legacyRedirectTarget } from './middleware';
import { UNCACHEABLE_PATH_PREFIXES } from './shared/uncacheable-paths';

/**
 * Regression guard for the matcher exclusion list, not the session-gate logic itself (that's
 * exercised by hand — a forged/absent cookie already 401s or 307s downstream, per
 * `middleware.ts`'s own doc comment). What matters here is narrower and easy to silently break when
 * the exclusion list is next edited: `robots.txt` and `sitemap.xml` (app/robots.ts, app/sitemap.ts
 * — both unauthenticated-by-design, per RFC 9309/sitemap conventions) must never be routed through
 * the login-redirect gate, or an unauthenticated crawler fetching either gets a 307 to
 * `/auth/login` instead of the document.
 *
 * `config.matcher[0]` is Next.js's own path-matcher syntax, not a plain JS RegExp — but this
 * particular pattern (a single capture group wrapping a negative lookahead, `/((?!a|b|...).*)`) is
 * valid regex source as-is, so it's reconstructed directly here rather than pulling in Next's
 * path-to-regexp compiler for a unit test.
 */
function matcherPattern(): RegExp {
  expect(config.matcher).toHaveLength(1);
  const source = config.matcher[0];
  expect(source.startsWith('/')).toBe(true);
  return new RegExp(`^${source.slice(1)}$`);
}

describe('middleware matcher', () => {
  it('excludes robots.txt and sitemap.xml from the session-cookie gate', () => {
    const pattern = matcherPattern();
    expect(pattern.test('robots.txt')).toBe(false);
    expect(pattern.test('sitemap.xml')).toBe(false);
  });

  it('still excludes the other public/unauthenticated paths', () => {
    const pattern = matcherPattern();
    for (const path of [
      'api/rpc/model.Account.list',
      'auth/login',
      '.well-known/oauth-protected-resource',
      '_next/static/chunk.js',
      'serwist/sw.js',
      'serwist/sw.js.map',
      'branding/logo',
      'branding/logo-light',
      'branding/override.css',
      'manifest.json',
      'icons/icon-192.png',
      'favicon.ico',
    ]) {
      expect(pattern.test(path), `${path} should be excluded from the matcher`).toBe(false);
    }
  });

  /**
   * The drift guard between this matcher and `src/shared/uncacheable-paths.ts`. The two lists are
   * not the same set — the matcher also skips `_next/`, `serwist/`, `icons/` and friends, which are
   * exactly the things the service worker *should* cache — but the containment holds in one
   * direction: a path the service worker must never cache is either unauthenticated by design
   * (`auth/*`) or authenticated per request with a machine-readable `401` (`api/*`), and neither
   * may be answered with a login redirect.
   *
   * It is asserted rather than shared because `config.matcher` cannot import the constant: Next
   * reads this export by static AST analysis at build time (`extractExportedConstValue`, see
   * `next/dist/build/analysis/`), which resolves literals declared in this module only. An imported
   * identifier silently yields no matcher at all — i.e. middleware running on *every* request,
   * including `/api/*` and the service worker script.
   */
  it('excludes every path the service worker refuses to cache', () => {
    const pattern = matcherPattern();
    for (const prefix of UNCACHEABLE_PATH_PREFIXES) {
      const path = `${prefix.slice(1)}/probe`;
      expect(pattern.test(path), `${path} should be excluded from the matcher`).toBe(false);
    }
  });

  it('still matches ordinary app routes, so they stay gated', () => {
    const pattern = matcherPattern();
    for (const path of ['', 'projects', 'api-keys', 'admin']) {
      expect(pattern.test(path), `${path || '/'} should stay matched (gated)`).toBe(true);
    }
  });
});

/**
 * IA v3 phase 1 ("account into the path") — every legacy deep link's redirect target, row by
 * row against `middleware.ts`'s own table doc comment. `legacyRedirectTarget` is the pure half of
 * the redirect (`middleware()` itself only decides WHETHER to run it — after the session-cookie
 * gate, per that function's own comment — and wraps a non-null result in a 308); this file tests
 * the row logic directly rather than through a full `NextRequest`/`NextResponse` round-trip.
 */
describe('legacyRedirectTarget', () => {
  const params = (query: string) => new URLSearchParams(query);

  it('/?account=A -> /accounts/A/overview', () => {
    expect(legacyRedirectTarget('/', params('account=A'))).toBe('/accounts/A/overview');
  });

  it('/projects?account=A -> /accounts/A/projects', () => {
    expect(legacyRedirectTarget('/projects', params('account=A'))).toBe('/accounts/A/projects');
  });

  it('/api-keys?account=A -> /accounts/A/api-keys', () => {
    expect(legacyRedirectTarget('/api-keys', params('account=A'))).toBe('/accounts/A/api-keys');
  });

  it('/projects -> /?next=projects', () => {
    expect(legacyRedirectTarget('/projects', params(''))).toBe('/?next=projects');
  });

  it('/api-keys -> /?next=api-keys', () => {
    expect(legacyRedirectTarget('/api-keys', params(''))).toBe('/?next=api-keys');
  });

  // IA v3 phase 2 ("the settings area") — the static path moves, `LEGACY_STATIC_REDIRECT`.
  // ADR 0013's "the admin area" amendment retires the old `/admin -> /settings/refills-queue`
  // row (`/admin` is a live route again) and replaces it with the refills-queue's SECOND move.
  it('/settings/refills-queue -> /admin/refills-queue, every param (incl. the selected request) surviving verbatim', () => {
    expect(legacyRedirectTarget('/settings/refills-queue', params(''))).toBe(
      '/admin/refills-queue'
    );
    expect(legacyRedirectTarget('/settings/refills-queue', params('request=req_9'))).toBe(
      '/admin/refills-queue?request=req_9'
    );
  });

  // The same day's second admin-only move (owner ruling, verbatim: "Refill options are for
  // admins only. Not normal users.", converse-frontends#368) — a straight rename, not a repeat
  // hop, so every param (there is nothing shaped differently between the two routes) survives.
  it('/settings/refill-options -> /admin/refill-policies, every param surviving verbatim', () => {
    expect(legacyRedirectTarget('/settings/refill-options', params(''))).toBe(
      '/admin/refill-policies'
    );
    expect(legacyRedirectTarget('/settings/refill-options', params('edit=budget-refill'))).toBe(
      '/admin/refill-policies?edit=budget-refill'
    );
  });

  it('/settings/projects -> /settings/policies, params surviving verbatim (same parser, new route)', () => {
    expect(legacyRedirectTarget('/settings/projects', params(''))).toBe('/settings/policies');
    expect(legacyRedirectTarget('/settings/projects', params('row=proj_1&q=demo'))).toBe(
      '/settings/policies?row=proj_1&q=demo'
    );
  });

  it('/settings/account -> /?next=overview — no account id for middleware to route through', () => {
    expect(legacyRedirectTarget('/settings/account', params(''))).toBe('/?next=overview');
    // The old rename-dialog trigger param is dropped; an unrelated param survives.
    expect(legacyRedirectTarget('/settings/account', params('account-name=true&q=x'))).toBe(
      '/?q=x&next=overview'
    );
  });

  // IA v3 phase E ("the settings/accounts move") — the two account-scoped path moves, the id
  // already in the old path (unlike the `LEGACY_ACCOUNT_SCOPED_SEGMENT` table above, which
  // extracts it out of `?account=`) and kept in the target.
  it('/accounts/A/projects -> /settings/accounts/A/projects, every param surviving verbatim', () => {
    expect(legacyRedirectTarget('/accounts/A/projects', params(''))).toBe(
      '/settings/accounts/A/projects'
    );
    expect(legacyRedirectTarget('/accounts/A/projects', params('status=active&row=proj_1'))).toBe(
      '/settings/accounts/A/projects?status=active&row=proj_1'
    );
  });

  it('/accounts/A/refill -> /settings/accounts/A/request-refill, ?project= surviving verbatim', () => {
    expect(legacyRedirectTarget('/accounts/A/refill', params(''))).toBe(
      '/settings/accounts/A/request-refill'
    );
    expect(legacyRedirectTarget('/accounts/A/refill', params('project=proj_7'))).toBe(
      '/settings/accounts/A/request-refill?project=proj_7'
    );
  });

  it('every OTHER /settings/* path is left alone — it is a live route, not a legacy link', () => {
    expect(legacyRedirectTarget('/settings/policies', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/tiers', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/info', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/overview', params(''))).toBeNull();
    // IA v3 phase E — the NEW routes themselves must never bounce, only the OLD paths that moved.
    expect(legacyRedirectTarget('/settings/accounts', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/accounts/A', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/accounts/A/projects', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/accounts/A/request-refill', params(''))).toBeNull();
  });

  // ADR 0013's "the admin area" amendment — the admin area's own three live routes must never
  // bounce; only the retired `/settings/refills-queue` and `/settings/refill-options` paths
  // above do.
  it('/admin/overview, /admin/refills-queue and /admin/refill-policies are live routes, never redirected', () => {
    expect(legacyRedirectTarget('/admin/overview', params(''))).toBeNull();
    expect(legacyRedirectTarget('/admin/refills-queue', params(''))).toBeNull();
    expect(legacyRedirectTarget('/admin/refill-policies', params(''))).toBeNull();
  });

  // Owner review round 2 (2026-08-31, converse-frontends#368 finding #4, verbatim): "You made out
  // of /admin/refill-policies?create=true a full page. Instead, I was thinking of a modal. But
  // it's fine. Just move it to a page /admin/refill-policies/create." A bookmarked/linked
  // `?create=true` still lands on the new route; every OTHER param survives verbatim, and `edit`/
  // `simulate` (untouched by this finding) never bounce.
  it('/admin/refill-policies?create=true -> /admin/refill-policies/create, other params surviving verbatim', () => {
    expect(legacyRedirectTarget('/admin/refill-policies', params('create=true'))).toBe(
      '/admin/refill-policies/create'
    );
    expect(
      legacyRedirectTarget('/admin/refill-policies', params('create=true&policy-set=budget-refill'))
    ).toBe('/admin/refill-policies/create?policy-set=budget-refill');
  });

  it('leaves /admin/refill-policies?edit=<id> and ?simulate=<id> alone — the owner named only create', () => {
    expect(legacyRedirectTarget('/admin/refill-policies', params('edit=budget-refill'))).toBeNull();
    expect(
      legacyRedirectTarget('/admin/refill-policies', params('simulate=budget-refill'))
    ).toBeNull();
  });

  it('/admin/refill-policies/create is itself a live route, never redirected', () => {
    expect(legacyRedirectTarget('/admin/refill-policies/create', params(''))).toBeNull();
  });

  it('a bare / with no ?account= is already the resolver — nothing to redirect', () => {
    expect(legacyRedirectTarget('/', params(''))).toBeNull();
  });

  it('strips only `account` (and, once resolved, `next`) — every other param survives onto the target', () => {
    expect(legacyRedirectTarget('/projects', params('account=A&status=active&row=proj_1'))).toBe(
      '/accounts/A/projects?status=active&row=proj_1'
    );
    expect(legacyRedirectTarget('/', params('account=A&next=projects'))).toBe(
      '/accounts/A/overview'
    );
  });

  it('preserves other params on the no-account rows too', () => {
    // `next` is appended after whatever already existed (`URLSearchParams.set` on a fresh key)
    // rather than reordering the existing params — order carries no meaning here, only presence.
    expect(legacyRedirectTarget('/api-keys', params('q=foo'))).toBe('/?q=foo&next=api-keys');
  });
});
