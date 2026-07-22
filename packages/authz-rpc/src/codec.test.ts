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
