import { describe, expect, it } from 'vitest';

import { config } from './proxy';

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe('proxy matcher', () => {
  it('excludes sign-in, the auth API, robots.txt, and the brand-mark images from the session gate', () => {
    for (const path of [
      '/sign-in',
      '/api/auth/login',
      '/api/auth/callback',
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
});
