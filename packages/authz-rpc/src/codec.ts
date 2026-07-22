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

export const CborCodec: Codec = {
  contentType: 'application/cbor',
  encode(value: unknown): Uint8Array {
    return cborEncode(value);
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
