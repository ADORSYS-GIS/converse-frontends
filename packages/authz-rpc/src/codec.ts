import { decode as cborDecode, encode as cborEncode } from 'cborg';

/** A wire codec: turns a JS value into request bytes and response bytes back into a JS value. */
export interface Codec {
  readonly contentType: string;
  encode(value: unknown): Uint8Array;
  decode(bytes: Uint8Array): unknown;
}

export const JsonCodec: Codec = {
  contentType: 'application/json',
  encode(value: unknown): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(value));
  },
  decode(bytes: Uint8Array): unknown {
    if (bytes.length === 0) {
      return undefined;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  },
};

/**
 * Drops `undefined`-valued object properties (recursively) so `cborEncode` sees exactly what
 * `JSON.stringify` would have kept. `JSON.stringify` silently omits `undefined`-valued keys;
 * `cborEncode` has no such behavior and instead encodes them as CBOR's `undefined` simple value
 * (RFC 8949 -- distinct from `null`), which the backend's generated `Option<T>` fields cannot
 * deserialize (`invalid_argument` / "invalid request payload"). This only ever reproduced on the
 * CBOR path (`defaultCodec()`'s production default) -- JSON traffic in dev/CI never hit it.
 * `undefined` array *elements* are left as-is (cborg encodes them the same way and there's no
 * JSON.stringify precedent to match -- `JSON.stringify` turns those into `null`, not a hole).
 */
function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = stripUndefined(entry);
      }
    }
    return result;
  }
  return value;
}

export const CborCodec: Codec = {
  contentType: 'application/cbor',
  encode(value: unknown): Uint8Array {
    return cborEncode(stripUndefined(value));
  },
  decode(bytes: Uint8Array): unknown {
    if (bytes.length === 0) {
      return undefined;
    }
    return cborDecode(bytes);
  },
};

/**
 * Matches the backend's env split (ADR-0003, "CBOR in production, JSON in dev/CI"):
 * production traffic goes over CBOR, everything else stays JSON so `curl`/browser devtools
 * stay readable. Overridable via `EXPO_PUBLIC_RPC_CODEC` for local CBOR-path testing.
 */
export function defaultCodec(): Codec {
  const override = process.env.EXPO_PUBLIC_RPC_CODEC;
  if (override === 'cbor') {
    return CborCodec;
  }
  if (override === 'json') {
    return JsonCodec;
  }
  return process.env.NODE_ENV === 'production' ? CborCodec : JsonCodec;
}
