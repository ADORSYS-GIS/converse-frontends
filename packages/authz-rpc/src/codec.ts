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
 * CBOR, always. The old env split (ADR-0003, "CBOR in production, JSON in dev/CI") is dead:
 * lightbridge-authz ADR-0013 made CBOR the ONLY transport codec for the RPC/CRUD surface and
 * DELETED the JSON variant rather than defaulting it off, so `authz-api`/`authz-budget` answer
 * a JSON `Accept` with `406 Not Acceptable` and a JSON body with `415`. A dev/prod codec split
 * is also exactly the "tested path != shipped path" gap ADR-0013 cites as having produced two
 * prod-only bugs invisible to a green CI -- dev must speak the wire format prod speaks.
 *
 * `JsonCodec` is retained as an export for its own unit tests and any non-authz consumer; it is
 * no longer reachable from this default.
 *
 * This `cborg`-based `CborCodec` is now specifically the **Expo app's** codec (`apps/self-service`
 * never calls `defaultCodec()` explicitly -- it relies on this being `runtime.ts`'s fallback). It
 * stays on `cborg` because `cborg` is pure JS with no native/WASM dependency, the one codec
 * implementation guaranteed to run identically under Hermes, V8, and a browser. `apps/console`
 * uses a different codec (`@cratestack/cbor`, see `./web-codec.ts`) precisely because it does NOT
 * have that constraint -- it is browser-only. This module (and `defaultCodec()`) is deleted along
 * with the rest of `apps/self-service` at the ADR 0009 Expo cutover, at which point `./web-codec.ts`
 * becomes the only codec left in this package.
 */
export function defaultCodec(): Codec {
  return CborCodec;
}
