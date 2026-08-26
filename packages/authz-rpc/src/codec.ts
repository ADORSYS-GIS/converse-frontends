import { createCborCodec } from '@cratestack/cbor';

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
 * CBOR, always -- `@cratestack/cbor`, cratestack's own umbrella package, is THE codec for both
 * `apps/console` and `apps/self-service`. lightbridge-authz ADR-0013 made CBOR the ONLY transport
 * codec for the RPC/CRUD surface (`authz-api`/`authz-budget` answer a JSON `Accept` with
 * `406 Not Acceptable` and a JSON body with `415`), and both apps in this workspace ship a
 * browser-only surface: `apps/console` is a Next.js app, and `apps/self-service` ships exclusively
 * as a web export (`expo export --platform web`, ADR 0006/0009) -- its `ios`/`android` scripts are
 * vestigial and not part of what's built or deployed. `@cratestack/cbor`'s `exports` map picks the
 * matching backend per environment: `@cratestack/cbor-node` (native N-API) under Node (this
 * package's own test suite), `@cratestack/cbor-web` (WASM, `wasm-pack --target web`) under a
 * browser/bundler `"browser"` condition -- exactly what both apps' shipped surfaces run under. A
 * prior revision of this module kept a second, `cborg`-based codec around specifically for a
 * Hermes/native-RN concern that does not apply to what `apps/self-service` actually ships; that
 * parallel path has been removed (converse-frontends -- purge of the dual-codec redundancy
 * introduced in #257) in favor of this single implementation, used identically by every consumer.
 *
 * `JsonCodec` above is retained as an export for its own unit tests (`codec.test.ts`'s untagged-
 * `Json`-field regression guard, see `docs/knowledge/rpc-and-codegen.md`) and any non-authz
 * consumer; it is not selected by either app's runtime.
 *
 * ## Async, once
 *
 * `@cratestack/cbor`'s `createCborCodec()` is an async factory on both platforms -- Node's own
 * `@cratestack/cbor-node` export is really synchronous under the hood, but the umbrella package
 * normalizes both to one `Promise`-returning shape (see its README's "Sync vs. async" section) so
 * callers never branch on environment. Once resolved, `encode`/`decode` are synchronous. This
 * module pays that one-time cost exactly once, cached at module scope: {@link ensureCborCodecReady}
 * is the single init entry point both apps await from their own async boot boundary
 * (`apps/console/src/client/providers.tsx`'s `ssr: false` dynamic import; `apps/self-service/src/
 * app/_layout.tsx`'s `fontsLoaded`-style readiness gate) before anything calls
 * {@link getCborCodec} or constructs an `AuthzRpcRuntime` without an explicit `codec` override.
 *
 * ## `undefined` handling
 *
 * Verified by round-trip test (`codec.test.ts`):
 *
 * - An `undefined`-valued **object property** is dropped by `@cratestack/cbor`'s own encoder,
 *   matching `JSON.stringify` natively -- no strip step is needed (the previous `cborg`-based codec
 *   needed a `stripUndefined()` backfill for exactly this gap; `@cratestack/cbor` does not).
 * - An `undefined` **array element**, however, makes `@cratestack/cbor`'s `encode()` throw
 *   synchronously (`"undefined cannot be represented as a serde_json::Value"`). This is intended,
 *   fail-fast behavior: a thrown error at the call site, before anything reaches the network, is a
 *   better failure mode than silently corrupting an array's element count or sending a value the
 *   backend would reject anyway. This module does NOT normalize that case away.
 */

let resolvedCodec: Codec | null = null;
let readyPromise: Promise<void> | null = null;

/**
 * Resolves the one-time WASM/native instantiation. Call this exactly once, before anything calls
 * {@link getCborCodec} -- see the module doc comment above for each app's call site. Safe to call
 * more than once: later calls await the same in-flight or already-settled promise rather than
 * re-instantiating.
 */
export function ensureCborCodecReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = createCborCodec()
      .then((codec) => {
        resolvedCodec = {
          contentType: codec.contentType,
          // `@cratestack/cbor`'s `encode()` returns the wider `BodyInit` DOM type (it's valid
          // `fetch` body content structurally); it is a real `Uint8Array` at runtime -- the
          // wasm-bindgen/N-API bindings both marshal a Rust `Vec<u8>` to one. Same cast
          // `runtime.ts`'s `toCratestackCodec()` does in the other direction.
          encode: (value: unknown) => codec.encode(value) as Uint8Array,
          decode: (bytes: Uint8Array) => codec.decode(bytes),
        };
      })
      .catch((error) => {
        // A failed instantiation must not be cached as a permanent success -- reset so the next
        // caller (e.g. a retried page load) gets a fresh attempt instead of a stuck rejection.
        readyPromise = null;
        throw error;
      });
  }
  return readyPromise;
}

/**
 * The synchronous accessor, and the default `codec` for {@link AuthzRpcRuntime} (see `./runtime.ts`).
 * Throws if called before {@link ensureCborCodecReady} has resolved -- a clear, debuggable failure
 * instead of silently falling back to some other codec, since a fallback here would mean the app
 * spoke a different wire format than it thinks it does.
 */
export function getCborCodec(): Codec {
  if (!resolvedCodec) {
    throw new Error(
      'getCborCodec() called before ensureCborCodecReady() resolved -- the app must await codec ' +
        'init (apps/console: providers.tsx; apps/self-service: _layout.tsx) before constructing ' +
        'any RPC client that does not pass an explicit `codec` override.'
    );
  }
  return resolvedCodec;
}
