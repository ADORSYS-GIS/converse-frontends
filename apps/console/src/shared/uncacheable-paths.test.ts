import { describe, expect, it } from 'vitest';

import {
  UNCACHEABLE_PATH_PREFIXES,
  filterPrecacheEntries,
  isUncacheablePath,
  isUncacheableUrl,
} from './uncacheable-paths';

/**
 * These assertions stand in for the service worker itself, which cannot be imported here: `sw.ts`
 * needs `lib: webworker` and a build-time-injected `self.__SW_MANIFEST`, so `tsc` and vitest both
 * skip it. Everything in `sw.ts` that decides *whether a request may be cached* is delegated to
 * this module precisely so it is reachable from a test.
 *
 * The production report this guards against: the service worker was serving `/auth/*` from cache.
 * `@serwist/next`'s `defaultCache` ends in same-origin catch-alls — a `NetworkFirst` `apis` cache
 * for `pathname.startsWith('/api/')`, then `pages`/`others` for everything else same-origin — so
 * both families were being stored and replayed.
 */
describe('isUncacheablePath', () => {
  it('excludes the OIDC redirect legs', () => {
    for (const path of [
      '/auth/login',
      '/auth/callback',
      '/auth/logout',
      '/auth/signed-out',
      '/auth/error',
    ]) {
      expect(isUncacheablePath(path), `${path} must never be cached`).toBe(true);
    }
  });

  it('excludes the authenticated server-side proxies', () => {
    for (const path of [
      '/api/rpc/model.Account.list',
      '/api/budget/rpc/requestBudgetRefill',
      '/api/usage/v1/usage/query',
      '/api/reports/consumption',
      '/api/session',
    ]) {
      expect(isUncacheablePath(path), `${path} must never be cached`).toBe(true);
    }
  });

  it('excludes the bare prefixes themselves', () => {
    expect(isUncacheablePath('/api')).toBe(true);
    expect(isUncacheablePath('/auth')).toBe(true);
  });

  it('leaves the cacheable app shell and static assets alone', () => {
    for (const path of [
      '/',
      '/projects',
      '/api-keys',
      '/admin',
      '/apikeys',
      '/authors',
      '/_next/static/chunks/main.js',
      '/icons/icon-192.png',
      '/manifest.json',
      '/.well-known/oauth-protected-resource',
    ]) {
      expect(isUncacheablePath(path), `${path} should stay cacheable`).toBe(false);
    }
  });

  it('does not match a prefix that only appears mid-path', () => {
    expect(isUncacheablePath('/projects/api/rpc')).toBe(false);
  });
});

describe('isUncacheableUrl', () => {
  it('inspects the pathname, not the raw string', () => {
    expect(isUncacheableUrl('/auth/callback?code=abc&state=def')).toBe(true);
    expect(isUncacheableUrl('/icons/icon-192.png?__WB_REVISION__=deadbeef')).toBe(false);
    expect(isUncacheableUrl('https://console.example.com/api/rpc/x')).toBe(true);
  });
});

describe('filterPrecacheEntries', () => {
  it('drops manifest entries under an uncacheable prefix and keeps the rest', () => {
    const manifest = [
      { url: '/_next/static/chunks/main.js', revision: null },
      { url: '/icons/icon-192.png', revision: 'abc' },
      { url: '/auth/login', revision: 'def' },
      '/api/session',
      '/manifest.json',
    ];

    expect(filterPrecacheEntries(manifest)).toStrictEqual([
      { url: '/_next/static/chunks/main.js', revision: null },
      { url: '/icons/icon-192.png', revision: 'abc' },
      '/manifest.json',
    ]);
  });

  it('tolerates an absent manifest (the service worker is disabled in development)', () => {
    expect(filterPrecacheEntries(undefined)).toStrictEqual([]);
  });
});

describe('UNCACHEABLE_PATH_PREFIXES', () => {
  it('are root-relative and carry no trailing slash', () => {
    for (const prefix of UNCACHEABLE_PATH_PREFIXES) {
      expect(prefix.startsWith('/')).toBe(true);
      expect(prefix.endsWith('/')).toBe(false);
    }
  });
});
