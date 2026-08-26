import { describe, expect, it } from 'vitest';

import { getCborCodec } from './codec';

// A separate file, not a case inside `codec.test.ts`: vitest gives each test file its own fresh
// module registry, so this is the only place `getCborCodec()` can be exercised without a prior
// `ensureCborCodecReady()` call having already resolved the module-level cache.
describe('getCborCodec() before ensureCborCodecReady() has resolved', () => {
  it('throws a clear, actionable error instead of silently returning something wrong', () => {
    expect(() => getCborCodec()).toThrow(/ensureCborCodecReady/);
  });
});
