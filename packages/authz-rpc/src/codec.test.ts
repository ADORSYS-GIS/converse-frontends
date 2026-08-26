import { beforeAll, describe, expect, it } from 'vitest';

import { JsonCodec, ensureCborCodecReady, getCborCodec } from './codec';
import type { Codec } from './codec';

// vitest's default `environment: 'node'` sets the `"node"` package.json `exports` condition, so
// `@cratestack/cbor` resolves to `@cratestack/cbor-node` (native N-API) here -- not the WASM build
// the browser actually ships. That's fine for what this suite verifies (the `Codec` contract and
// the wire-shape/undefined-handling behavior, all specified to be identical across both
// `@cratestack/cbor` backends per its own README) but it does NOT exercise WASM instantiation
// under a real browser/bundler -- that's each app's own dev/build boot, verified separately (see
// this package's top-level README / the console's `next dev` verification, and this refactor's
// `expo export --platform web` verification for `apps/self-service`).
describe('CborCodec (@cratestack/cbor)', () => {
  let codec: Codec;

  beforeAll(async () => {
    await ensureCborCodecReady();
    codec = getCborCodec();
  });

  // cratestack-cli 0.7.16 (matching the deployed backend) puts plain, untagged values on the
  // wire for `Json` columns -- `defaultLimits`/`allowedModels` round-trip exactly as written,
  // no `{"Map": ...}`/`{"List": ...}` wrapper. See lightbridge-authz#282: a stale tagged shape
  // decodes without error against an untagged `Value` and silently defeats the `allowedModels`
  // governance allowlist, so this payload doubles as a regression guard for that shape.
  const payload = {
    id: 'abc123',
    name: 'proj',
    defaultLimits: {},
    allowedModels: ['gpt-4'],
    createdAt: '2026-07-22T00:00:00Z',
  };

  it('reports the CBOR content type', () => {
    expect(codec.contentType).toBe('application/cbor');
  });

  it('round-trips the RPC payload shape as plain values', () => {
    const bytes = codec.encode(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const decoded = codec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
    expect(decoded.defaultLimits).toEqual({});
    expect(decoded.allowedModels).toEqual(['gpt-4']);
  });

  it('decodes maps as plain objects, not Map instances', () => {
    const bytes = codec.encode({ nested: { a: 'x' } });
    const decoded = codec.decode(bytes) as Record<string, unknown>;
    expect(decoded).not.toBeInstanceOf(Map);
    expect(decoded.nested).toEqual({ a: 'x' });
  });

  it('fails if allowedModels is ever externally tagged again (regression guard for #282)', () => {
    // A reintroduced tagging layer would encode `['gpt-4']` as `{ List: [{ String: 'gpt-4' }] }`.
    // Assert the wire payload is the bare array, not an object with a `List`/`Map` key -- this is
    // exactly the shape difference that let a stale tagged payload silently defeat the backend's
    // allowedModels enforcement (`json_to_vec`'s `as_array()` returns `None` for an object,
    // which the enforcement path reads as "no restriction, allow all models").
    const bytes = codec.encode({ allowedModels: ['gpt-4'] });
    const decoded = codec.decode(bytes) as { allowedModels: unknown };
    expect(Array.isArray(decoded.allowedModels)).toBe(true);
    expect(decoded.allowedModels).toEqual(['gpt-4']);
  });

  describe('undefined handling', () => {
    it('drops an undefined-valued top-level object property, matching JSON.stringify', () => {
      const undefPayload = { name: 'demo', allowedModels: undefined, billingPlan: 'free' };
      const decoded = codec.decode(codec.encode(undefPayload)) as Record<string, unknown>;
      expect('allowedModels' in decoded).toBe(false);
      expect(decoded).toEqual(JSON.parse(JSON.stringify(undefPayload)));
    });

    it('drops an undefined-valued nested object property', () => {
      const undefPayload = { project: { name: 'demo', allowedModels: undefined } };
      const decoded = codec.decode(codec.encode(undefPayload)) as {
        project: Record<string, unknown>;
      };
      expect('allowedModels' in decoded.project).toBe(false);
    });

    it('still round-trips a present value at the same key', () => {
      const presentPayload = { name: 'demo', allowedModels: ['gpt-4'] };
      const decoded = codec.decode(codec.encode(presentPayload)) as typeof presentPayload;
      expect(decoded.allowedModels).toEqual(['gpt-4']);
    });

    it('still round-trips null, distinct from undefined, at the same key', () => {
      const nullPayload = { name: 'demo', allowedModels: null };
      const decoded = codec.decode(codec.encode(nullPayload)) as Record<string, unknown>;
      expect(decoded.allowedModels).toBeNull();
    });

    // Deliberately NOT normalized away (see the module doc comment in `./codec.ts`): an undefined
    // array element throws synchronously rather than silently corrupting the array or reaching the
    // network. This pins down intended, fail-fast behavior, not a bug.
    it('throws synchronously on an undefined array element', () => {
      expect(() => codec.encode({ arr: [1, undefined, 3] })).toThrow();
    });
  });
});

describe('JsonCodec', () => {
  const payload = {
    id: 'abc123',
    name: 'proj',
    defaultLimits: {},
    allowedModels: ['gpt-4'],
    createdAt: '2026-07-22T00:00:00Z',
  };

  it('round-trips the same payload identically to CBOR', () => {
    const bytes = JsonCodec.encode(payload);
    const decoded = JsonCodec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
  });
});
