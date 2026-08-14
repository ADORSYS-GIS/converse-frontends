import { describe, expect, it } from 'vitest';

import { CborCodec, JsonCodec } from './codec';

describe('CborCodec / JsonCodec', () => {
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

  it('CBOR round-trips the RPC payload shape as plain values', () => {
    const bytes = CborCodec.encode(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const decoded = CborCodec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
    expect(decoded.defaultLimits).toEqual({});
    expect(decoded.allowedModels).toEqual(['gpt-4']);
  });

  it('JSON round-trips the same payload identically to CBOR', () => {
    const bytes = JsonCodec.encode(payload);
    const decoded = JsonCodec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
  });

  it('CBOR decodes maps as plain objects, not Map instances', () => {
    const bytes = CborCodec.encode({ nested: { a: 'x' } });
    const decoded = CborCodec.decode(bytes) as Record<string, unknown>;
    expect(decoded).not.toBeInstanceOf(Map);
    expect(decoded.nested).toEqual({ a: 'x' });
  });

  it('fails if allowedModels is ever externally tagged again (regression guard for #282)', () => {
    // A reintroduced tagging layer would encode `['gpt-4']` as `{ List: [{ String: 'gpt-4' }] }`.
    // Assert the wire payload is the bare array, not an object with a `List`/`Map` key -- this is
    // exactly the shape difference that let a stale tagged payload silently defeat the backend's
    // allowedModels enforcement (`json_to_vec`'s `as_array()` returns `None` for an object,
    // which the enforcement path reads as "no restriction, allow all models").
    const bytes = CborCodec.encode({ allowedModels: ['gpt-4'] });
    const decoded = CborCodec.decode(bytes) as { allowedModels: unknown };
    expect(Array.isArray(decoded.allowedModels)).toBe(true);
    expect(decoded.allowedModels).toEqual(['gpt-4']);
  });
});

describe('CborCodec undefined-value handling', () => {
  // Regression coverage for the prod-only project-creation bug: `cborEncode` (unlike
  // `JSON.stringify`) does not drop `undefined`-valued object properties -- it encodes them as
  // CBOR's `undefined` simple value, which the backend rejects as an invalid payload. See
  // `stripUndefined` in `codec.ts`.

  it('omits an undefined-valued top-level property, matching JSON.stringify', () => {
    const payload = { name: 'demo', allowedModels: undefined, billingPlan: 'free' };
    const decoded = CborCodec.decode(CborCodec.encode(payload)) as Record<string, unknown>;
    expect('allowedModels' in decoded).toBe(false);
    expect(decoded).toEqual(JSON.parse(JSON.stringify(payload)));
  });

  it('omits an undefined-valued nested property', () => {
    const payload = { project: { name: 'demo', allowedModels: undefined } };
    const decoded = CborCodec.decode(CborCodec.encode(payload)) as {
      project: Record<string, unknown>;
    };
    expect('allowedModels' in decoded.project).toBe(false);
  });

  it('still round-trips a present value at the same key', () => {
    const payload = { name: 'demo', allowedModels: ['gpt-4'] };
    const decoded = CborCodec.decode(CborCodec.encode(payload)) as typeof payload;
    expect(decoded.allowedModels).toEqual(['gpt-4']);
  });

  it('still round-trips null, distinct from undefined, at the same key', () => {
    const payload = { name: 'demo', allowedModels: null };
    const decoded = CborCodec.decode(CborCodec.encode(payload)) as Record<string, unknown>;
    expect(decoded.allowedModels).toBeNull();
  });
});
