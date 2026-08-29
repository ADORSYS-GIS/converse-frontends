import { describe, expect, it } from 'vitest';

import { config } from './middleware';
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
      'sw.js',
      'swe-worker-abc123.js',
      'manifest.json',
      'icons/icon-192.png',
      'favicon.ico',
    ]) {
      expect(pattern.test(path), `${path} should be excluded from the matcher`).toBe(false);
    }
  });

  /**
   * The drift guard between this matcher and `src/shared/uncacheable-paths.ts`. The two lists are
   * not the same set — the matcher also skips `_next/`, `sw.js`, `icons/` and friends, which are
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
    for (const path of ['', 'manage', 'api-keys', 'admin']) {
      expect(pattern.test(path), `${path || '/'} should stay matched (gated)`).toBe(true);
    }
  });
});
