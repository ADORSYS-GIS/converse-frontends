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

  // IA v3 phase 2 ("the settings area") — the three static path moves, `LEGACY_STATIC_REDIRECT`.
  it('/admin -> /settings/refills-queue, every param (incl. the selected request) surviving verbatim', () => {
    expect(legacyRedirectTarget('/admin', params(''))).toBe('/settings/refills-queue');
    expect(legacyRedirectTarget('/admin', params('request=req_9'))).toBe(
      '/settings/refills-queue?request=req_9'
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

  it('every OTHER /settings/* path is left alone — it is a live route, not a legacy link', () => {
    expect(legacyRedirectTarget('/settings/policies', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/tiers', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/info', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/overview', params(''))).toBeNull();
    expect(legacyRedirectTarget('/settings/refills-queue', params(''))).toBeNull();
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
