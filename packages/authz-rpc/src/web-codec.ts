import { createCborCodec } from '@cratestack/cbor';

import type { Codec } from './codec';

/**
 * The console's CBOR codec -- `@cratestack/cbor`, cratestack's own umbrella package, instead of
 * the `cborg`-based `CborCodec` in `./codec.ts`.
 *
 * Deliberately a SEPARATE module (own `package.json` `exports` subpath: `@lightbridge/authz-rpc/
 * web-codec`), not folded into `codec.ts`, so `apps/self-service` never imports `@cratestack/cbor`
 * even transitively. That matters because `@cratestack/cbor`'s `exports` map ships exactly two
 * backends -- `@cratestack/cbor-node` (native N-API, Node-only) and `@cratestack/cbor-web`
 * (WASM, via `wasm-pack --target web`, resolved through the `"browser"`/`"default"` condition) --
 * and NEITHER runs under Hermes/JSI, which is what `apps/self-service`'s native (iOS/Android)
 * builds actually execute on. A native N-API binary cannot load in a JS engine that isn't Node; a
 * WASM module built for `--target web` resolves its `.wasm` asset via `import.meta.url` + `fetch`,
 * which this repo's Metro config (`apps/self-service/metro.config.js`) has no asset-pipeline
 * support for, on top of Hermes's own WebAssembly support being new and still maturing as of
 * React Native 0.84+. This is a real gap in `@cratestack/cbor`'s own platform coverage today --
 * worth feeding back upstream as roadmap input (no React-Native/Hermes-targeted backend exists
 * yet) -- not something this app can paper over.
 *
 * `apps/console` has no such constraint: it is a Next.js app, browser-only for anything that
 * touches this codec (see `apps/console/src/client/providers.tsx`'s `ssr: false` gate), so the
 * WASM backend is exactly the environment `@cratestack/cbor-web` targets. `apps/self-service`
 * keeps the shared `cborg`-based `CborCodec` (`./codec.ts`) for as long as it exists; this module
 * (and the `@cratestack/cbor` dependency) dies with it at the ADR 0009 Expo cutover, when
 * `apps/self-service` is deleted and every RPC consumer left in the workspace is browser-only.
 *
 * ## Async, once
 *
 * `@cratestack/cbor`'s `createCborCodec()` is an async factory on both platforms -- Node's own
 * `@cratestack/cbor-node` export is really synchronous under the hood, but the umbrella package
 * normalizes both to one `Promise`-returning shape (see its README's "Sync vs. async" section) so
 * callers never branch on environment. Once resolved, `encode`/`decode` are synchronous. This
 * module pays that one-time cost exactly once, cached at module scope:
 * `ensureWebCborCodecReady()` is awaited from `apps/console/src/client/providers.tsx`'s `ssr: false`
 * dynamic-import boundary -- the same boundary that already gates the whole provider tree behind
 * one async step (the generated runtime resolves URLs against an absolute origin and cannot run
 * during a server render), so this adds no NEW loading state, it only extends an already-necessary
 * one. `apps/console/src/client/rpc-clients.ts` then calls the synchronous `getWebCborCodec()`,
 * which is only ever reached after that gate has resolved.
 *
 * ## `undefined` handling differs from `cborg` -- deliberately not patched over
 *
 * Verified by round-trip test (`web-codec.test.ts`):
 *
 * - An `undefined`-valued **object property** is dropped by `@cratestack/cbor`'s own encoder,
 *   matching `JSON.stringify` -- exactly what `./codec.ts`'s `stripUndefined()` exists to
 *   backfill for `cborg`. No equivalent wrapping is needed here; `stripUndefined()` would be
 *   genuinely redundant on this codec's `encode()` path, so this module does not call it.
 * - An `undefined` **array element**, however, makes `@cratestack/cbor`'s `encode()` throw
 *   synchronously (`"undefined cannot be represented as a serde_json::Value"`), unlike `cborg`
 *   (which silently encodes it as CBOR's `undefined` simple value -- see `codec.ts`'s comment) or
 *   `JSON.stringify` (which turns it into `null`). This module does NOT normalize that case away:
 *   a thrown error at the call site, before anything reaches the network, is a better failure mode
 *   than silently corrupting an array's element count or a value the backend would reject anyway.
 *   Every current console RPC call site was audited for a producer of `undefined` array elements
 *   (none found as of this writing); if one is ever introduced, fix it at the source rather than
 *   adding a strip step here.
 */

let resolvedCodec: Codec | null = null;
let readyPromise: Promise<void> | null = null;

/**
 * Resolves the one-time WASM instantiation. Call this exactly once, before anything calls
 * {@link getWebCborCodec} -- `apps/console/src/client/providers.tsx`'s dynamic-import boundary is
 * the intended (and only) caller. Safe to call more than once: later calls await the same in-flight
 * or already-settled promise rather than re-instantiating.
 */
export function ensureWebCborCodecReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = createCborCodec()
      .then((codec) => {
        resolvedCodec = {
          contentType: codec.contentType,
          // `@cratestack/cbor`'s `encode()` returns the wider `BodyInit` DOM type (it's valid
          // `fetch` body content structurally); it is a real `Uint8Array` at runtime -- the
          // wasm-bindgen/N-API bindings both marshal a Rust `Vec<u8>` to one. Same cast
          // `runtime.ts`'s `toCratestackCodec()` does in the other direction for `./codec.ts`.
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
 * The synchronous accessor. Throws if called before {@link ensureWebCborCodecReady} has resolved --
 * a clear, debuggable failure instead of silently falling back to some other codec, since a
 * fallback here would mean the console spoke a different wire format than it thinks it does.
 */
export function getWebCborCodec(): Codec {
  if (!resolvedCodec) {
    throw new Error(
      'getWebCborCodec() called before ensureWebCborCodecReady() resolved -- the console provider ' +
        "tree must await codec init (see apps/console/src/client/providers.tsx's dynamic import) " +
        'before any RPC client is constructed.'
    );
  }
  return resolvedCodec;
}
