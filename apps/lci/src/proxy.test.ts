import { describe, expect, it } from 'vitest';

import { config } from './proxy';

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe('proxy matcher', () => {
  it('excludes sign-in, the auth API, robots.txt, the brand-mark images, the PWA manifest and icons, and the service worker route from the session gate', () => {
    for (const path of [
      '/sign-in',
      '/api/auth/login',
      '/api/auth/callback',
      '/robots.txt',
      '/branding/logo',
      '/branding/logo-light',
      '/manifest.json',
      '/icons/icon.svg',
      '/icons/icon-192.png',
      '/serwist/sw.js',
      '/serwist/sw.js.map',
    ]) {
      expect(matcher.test(path)).toBe(false);
    }
  });

  it('protects every real screen and API route', () => {
    for (const path of [
      '/',
      '/repositories',
      '/repositories/1/graph',
      '/runs/1',
      '/api/repositories/1/graph',
    ]) {
      expect(matcher.test(path)).toBe(true);
    }
  });
});
