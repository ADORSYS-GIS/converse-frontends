import { describe, expect, it } from 'vitest';

import { CborCodec, JsonCodec } from './codec';
import { tagValue, untagValue } from './value';

describe('CborCodec / JsonCodec', () => {
  const payload = {
    id: 'abc123',
    name: 'proj',
    defaultLimits: tagValue({}),
    allowedModels: tagValue(['gpt-4']),
    createdAt: '2026-07-22T00:00:00Z',
  };

  it('CBOR round-trips the RPC payload shape, including tagged Value fields', () => {
    const bytes = CborCodec.encode(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const decoded = CborCodec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
    expect(untagValue(decoded.defaultLimits)).toEqual({});
    expect(untagValue(decoded.allowedModels)).toEqual(['gpt-4']);
  });

  it('JSON round-trips the same payload identically to CBOR', () => {
    const bytes = JsonCodec.encode(payload);
    const decoded = JsonCodec.decode(bytes) as typeof payload;
    expect(decoded).toEqual(payload);
  });

  it('CBOR decodes maps as plain objects, not Map instances', () => {
    const bytes = CborCodec.encode({ Map: { a: { String: 'x' } } });
    const decoded = CborCodec.decode(bytes) as Record<string, unknown>;
    expect(decoded).not.toBeInstanceOf(Map);
    expect(decoded.Map).toEqual({ a: { String: 'x' } });
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
    const payload = { name: 'demo', allowedModels: tagValue(['gpt-4']) };
    const decoded = CborCodec.decode(CborCodec.encode(payload)) as typeof payload;
    expect(untagValue(decoded.allowedModels)).toEqual(['gpt-4']);
  });

  it('still round-trips null, distinct from undefined, at the same key', () => {
    const payload = { name: 'demo', allowedModels: null };
    const decoded = CborCodec.decode(CborCodec.encode(payload)) as Record<string, unknown>;
    expect(decoded.allowedModels).toBeNull();
  });
});
