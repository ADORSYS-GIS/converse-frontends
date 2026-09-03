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
 */
describe('isUncacheablePath', () => {
  it('excludes the OIDC redirect legs', () => {
    for (const path of ['/api/auth/login', '/api/auth/callback', '/api/auth/logout']) {
      expect(isUncacheablePath(path), `${path} must never be cached`).toBe(true);
    }
  });

  it('excludes the authenticated control-plane proxies', () => {
    for (const path of [
      '/api/repositories/81/graph',
      '/api/repositories/81/symbols/node-1/similar',
    ]) {
      expect(isUncacheablePath(path), `${path} must never be cached`).toBe(true);
    }
  });

  it('excludes the bare prefix itself', () => {
    expect(isUncacheablePath('/api')).toBe(true);
  });

  it('leaves the cacheable app shell and static assets alone', () => {
    for (const path of [
      '/',
      '/repositories',
      '/repositories/81',
      '/repositories/81/settings',
      '/runs',
      '/runs/task-1',
      '/admin',
      '/admin/accepted',
      '/admin/denied',
      '/settings',
      '/sign-in',
      '/branding/logo',
      '/branding/logo-light',
      '/_next/static/chunks/main.js',
      '/icons/icon-192.png',
      '/manifest.json',
    ]) {
      expect(isUncacheablePath(path), `${path} should stay cacheable`).toBe(false);
    }
  });

  it('does not match a prefix that only appears mid-path', () => {
    expect(isUncacheablePath('/repositories/api/graph')).toBe(false);
  });
});

describe('isUncacheableUrl', () => {
  it('inspects the pathname, not the raw string', () => {
    expect(isUncacheableUrl('/api/auth/callback?code=abc&state=def')).toBe(true);
    expect(isUncacheableUrl('/icons/icon-192.png?__WB_REVISION__=deadbeef')).toBe(false);
    expect(isUncacheableUrl('https://lci.example.com/api/repositories/81/graph')).toBe(true);
  });
});

describe('filterPrecacheEntries', () => {
  it('drops manifest entries under an uncacheable prefix and keeps the rest', () => {
    const manifest = [
      { url: '/_next/static/chunks/main.js', revision: null },
      { url: '/icons/icon-192.png', revision: 'abc' },
      { url: '/api/auth/login', revision: 'def' },
      '/api/repositories/81/graph',
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
