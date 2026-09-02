import { describe, expect, it } from 'vitest';

import robots from './robots';

describe('robots (/robots.txt)', () => {
  it('disallows every crawler from the entire origin', () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    });
  });

  it('does not reference a sitemap — nothing to point a disallowed crawler at', () => {
    expect(robots()).not.toHaveProperty('sitemap');
  });
});
