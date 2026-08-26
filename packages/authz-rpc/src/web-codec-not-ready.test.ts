import { describe, expect, it } from 'vitest';

import { getWebCborCodec } from './web-codec';

// A separate file, not a case inside `web-codec.test.ts`: vitest gives each test file its own
// fresh module registry, so this is the only place `getWebCborCodec()` can be exercised without a
// prior `ensureWebCborCodecReady()` call having already resolved the module-level cache.
describe('getWebCborCodec() before ensureWebCborCodecReady() has resolved', () => {
  it('throws a clear, actionable error instead of silently returning something wrong', () => {
    expect(() => getWebCborCodec()).toThrow(/ensureWebCborCodecReady/);
  });
});
