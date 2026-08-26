import { beforeAll, describe, expect, it } from 'vitest';

import { ensureWebCborCodecReady, getWebCborCodec } from './web-codec';
import type { Codec } from './codec';

// vitest's default `environment: 'node'` sets the `"node"` package.json `exports` condition, so
// `@cratestack/cbor` resolves to `@cratestack/cbor-node` (native N-API) here -- not the WASM
// build `apps/console` actually ships. That's fine for what this suite verifies (the `Codec`
// contract and the wire-shape/undefined-handling behavior, all specified to be identical across
// both `@cratestack/cbor` backends per its own README) but it does NOT exercise WASM
// instantiation under a real browser/bundler -- that's `apps/console`'s `next dev`/`next build`
// boot, verified separately.
describe('web-codec (@cratestack/cbor)', () => {
  let codec: Codec;

  beforeAll(async () => {
    await ensureWebCborCodecReady();
    codec = getWebCborCodec();
  });

  it('reports the CBOR content type', () => {
    expect(codec.contentType).toBe('application/cbor');
  });

  it('round-trips the RPC payload shape as plain values (parity with the cborg-based CborCodec)', () => {
    const payload = {
      id: 'abc123',
      name: 'proj',
      defaultLimits: {},
      allowedModels: ['gpt-4'],
      createdAt: '2026-07-22T00:00:00Z',
    };
    const bytes = codec.encode(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const decoded = codec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
  });

  it('decodes maps as plain objects, not Map instances', () => {
    const bytes = codec.encode({ nested: { a: 'x' } });
    const decoded = codec.decode(bytes) as Record<string, unknown>;
    expect(decoded).not.toBeInstanceOf(Map);
    expect(decoded.nested).toEqual({ a: 'x' });
  });

  describe('undefined handling -- native, no stripUndefined() needed', () => {
    it('drops an undefined-valued top-level object property, matching JSON.stringify', () => {
      const payload = { name: 'demo', allowedModels: undefined, billingPlan: 'free' };
      const decoded = codec.decode(codec.encode(payload)) as Record<string, unknown>;
      expect('allowedModels' in decoded).toBe(false);
      expect(decoded).toEqual(JSON.parse(JSON.stringify(payload)));
    });

    it('drops an undefined-valued nested object property', () => {
      const payload = { project: { name: 'demo', allowedModels: undefined } };
      const decoded = codec.decode(codec.encode(payload)) as {
        project: Record<string, unknown>;
      };
      expect('allowedModels' in decoded.project).toBe(false);
    });

    it('still round-trips null, distinct from undefined, at the same key', () => {
      const payload = { name: 'demo', allowedModels: null };
      const decoded = codec.decode(codec.encode(payload)) as Record<string, unknown>;
      expect(decoded.allowedModels).toBeNull();
    });

    // Deliberately NOT normalized away (see web-codec.ts's module doc comment): an undefined
    // array element throws synchronously rather than silently corrupting the array or reaching
    // the network. This is a real behavior difference from the cborg-based CborCodec (which
    // leaves array elements as-is) -- documented here as a regression guard, not a bug.
    it('throws synchronously on an undefined array element, unlike the cborg-based CborCodec', () => {
      expect(() => codec.encode({ arr: [1, undefined, 3] })).toThrow();
    });
  });
});
