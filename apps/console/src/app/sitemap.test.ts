import { describe, expect, it } from 'vitest';

import sitemap from './sitemap';

describe('sitemap (/sitemap.xml)', () => {
  it('is permanently empty — a valid <urlset> with zero <url> entries, not a 404', () => {
    expect(sitemap()).toEqual([]);
  });
});
