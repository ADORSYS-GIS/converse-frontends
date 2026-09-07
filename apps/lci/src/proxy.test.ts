import { describe, expect, it } from 'vitest';

import { config } from './proxy';

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe('proxy matcher', () => {
  it('excludes every /auth/* route, robots.txt, and the brand-mark images from the session gate', () => {
    for (const path of [
      '/auth/login',
      '/auth/callback',
      '/auth/logout',
      '/auth/error',
      '/robots.txt',
      '/branding/logo',
      '/branding/logo-light',
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

  it('does not exempt a path that only starts with the same letters as an exempt prefix', () => {
    for (const path of ['/authenticate', '/brandingx', '/robots.txtx']) {
      expect(matcher.test(path)).toBe(true);
    }
  });
});
