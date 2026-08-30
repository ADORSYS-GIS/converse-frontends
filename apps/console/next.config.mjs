import { createRequire } from 'node:module';

const { version } = createRequire(import.meta.url)('./package.json');

/**
 * Response headers applied to every route. Deliberately narrow: the console is the only exposed
 * origin (ADR 0009 Decision 3), so it never needs to be framed, sniffed or referrer-leaked into a
 * third party. A CSP is intentionally NOT set here — Next's inline bootstrap needs a per-request
 * nonce to be worth having, and a `unsafe-inline` CSP would be security theatre.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/**
 * The console runs **Turbopack for both development and the production build**
 * (`package.json`: `dev: next dev --turbopack`, `build:web: next build --turbopack`). Production
 * used to stay on webpack for exactly one reason — `@serwist/next`, the Serwist integration that
 * compiled `src/sw.ts` into `public/sw.js`, was a webpack plugin, and Turbopack never calls the
 * `webpack()` config function at all — but that reason is gone: the console now runs
 * `@serwist/turbopack` instead, whose `createSerwistRoute` bundles `src/sw.ts` with `esbuild-wasm`
 * inside a normal route handler (`src/app/serwist/[path]/route.ts`) rather than a build-time
 * bundler plugin, so it needs no `webpack()` hook and no `withSerwist(nextConfig)` wrapper at all —
 * there is nothing left in this file to opt Turbopack out for. Serving from a route also means the
 * service worker is no longer a `public/` build artifact: `/serwist/sw.js` is generated on demand
 * (dev) or at static-generation time (`next build --turbopack`), never written to `public/`.
 *
 * Development moved to Turbopack first, once the blocker that used to pin it to webpack was removed
 * at the source. `packages/authz-rpc/generated/` is emitted by `cratestack generate-typescript` in
 * the NodeNext convention, importing its siblings as `./runtime.js` for `runtime.ts`. `tsc`, vitest,
 * Metro and webpack (via `experimental.extensionAlias`, which used to live in this file) all
 * resolve that; Turbopack has no equivalent — neither `turbopack.resolveExtensions` nor
 * `turbopack.resolveAlias` (`{'*.js': ['*.ts', '*.js']}`) makes it map the specifier onto the `.ts`
 * source, re-verified against this exact Next version. The fix is now in the generator's own
 * output: `packages/authz-rpc/scripts/normalize-generated-specifiers.mjs` runs as the second half
 * of that package's `codegen` script and strips the extension from those 23 relative specifiers,
 * which every consumer resolves (the generated tree compiles under `moduleResolution: "Bundler"`,
 * where the extension is optional). `experimental.extensionAlias` is therefore gone from this file
 * — nothing else in the repo emits NodeNext-style relative specifiers.
 *
 * Measured on the branch that moved development to Turbopack (medians of 3 cold runs, still valid
 * for why dev stayed on Turbopack once production followed): first compile of `/` 6.37s -> 1.86s,
 * `/manage` 2.00s -> 0.44s, edit-to-rebuilt 200ms -> 71ms, first `/manage` after a warm restart
 * 5.22s -> 2.50s, dev JS+CSS served per page load 13.6 MiB -> 9.1 MiB. The webpack profile said why:
 * on a cold `/`, `next-flight-client-module-loader + next-swc-loader` was 17.5s of the 18.9s of
 * server-compilation loader time — SWC transpiling ~1480 server and ~1190 client modules, which is
 * precisely the work Turbopack does in Rust. See apps/console/README.md for the tables.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The console ships as a Node-runtime container (ticket #287), not a static export — it has 8
  // server route handlers and server components that decrypt the session cookie, so it needs
  // `next start`'s Node server, not `output: 'export'`. `standalone` traces the actual runtime
  // dependency graph out of node_modules into `.next/standalone/`, so the container image doesn't
  // need to `pnpm install` the whole workspace (dev/build-only deps, other apps' deps, etc.) —
  // only what `apps/console/server.js` actually requires at runtime gets copied in. See
  // `apps/console/Dockerfile` for the container build that consumes this output.
  output: 'standalone',

  // ── The usage scope guard's CBOR codec must survive the container image (2026-08-30 incident:
  // every /api/usage call 500ed in prod with an empty body). `server/authz-account-lookup.ts` is
  // the FIRST server-side consumer of `@cratestack/cbor` — until it, CBOR was browser-bundle-only,
  // so the standalone tracer had never needed the packages and the container shipped without them;
  // the bundler externalizes the native N-API addon, the route module threw at import, and Next
  // answered a bare 500 before any handler (or its fail-closed 403) could run.
  //
  // `serverExternalPackages` is a Next feature independent of which bundler is active (webpack or
  // Turbopack): it keeps the bundler from trying to inline the native addon into a route's server
  // bundle, so the codec stays a real on-disk package rather than something Next tries to trace
  // through and inline.
  //
  // Getting the actual `@cratestack/cbor*` package FILES into the image is, as of this change, NOT
  // this file's job any more — it moved to `apps/console/Dockerfile` (a `COPY` of the pnpm store
  // dirs from the build context, plus `scripts/link-standalone-cratestack.mjs` re-run at image-build
  // time to re-materialize the top-level `node_modules/@cratestack/*` scope links). This file used
  // to also carry an `outputFileTracingIncludes` block doing the equivalent job via Next's own
  // standalone tracer (`'../../node_modules/.pnpm/@cratestack+cbor*/**'` and siblings). That block
  // is gone because under Turbopack (Next 16.3.2, Turbopack build `d0ac8828`) it doesn't just fail
  // to help — it crashes the build outright. Any `outputFileTracingIncludes` glob that resolves
  // through a pnpm-store symlink to a *directory* (e.g. the per-platform
  // `@cratestack/cbor-node-darwin-arm64` binary package, or `@cratestack/adapter-rtk`'s
  // `@cratestack/ts-types` dependency) makes Turbopack's NFT-JSON emitter try to read that directory
  // as a file and panic:
  //
  //   Error [TurbopackInternalError]: reading file ".../node_modules/.pnpm/@cratestack+adapter-rtk@0.9.4/node_modules/@cratestack/ts-types"
  //   Caused by: Is a directory (os error 21)
  //   Debug info: ... <NftJsonAsset as Asset>::content failed -> *FileContent::hash failed ->
  //   <DiskFileSystem as FileSystem>::read failed -> reading file "...@cratestack/ts-types" ->
  //   Is a directory (os error 21)
  //
  // Verified this isn't a pattern problem: narrowing the glob to only the cbor packages still
  // panicked (on `@cratestack/cbor-node-darwin-arm64` instead), and switching `**` to `**/*` still
  // panicked on the exact same file — any glob that can match a symlinked directory hits this, so
  // there is no safe glob to write here. This was never caught before because `build:web` was
  // pinned to `--webpack` (for the unrelated old serwist-webpack-plugin reason) until this same
  // change moved it to `--turbopack` — this is the first time this app's production build ever ran
  // under Turbopack with the CBOR fix in place.
  //
  // ── KNOWN GAP, discovered verifying the above (not caused by it, and not fixed here — flagged
  // for its own follow-up): `@cratestack/cbor-node`'s prebuilt N-API bindings are glibc-only
  // (`optionalDependencies`: darwin-x64, darwin-arm64, linux-x64-gnu, linux-arm64-gnu,
  // win32-x64-msvc — no musl variant, no wasm32-wasi fallback actually published despite
  // `native.mjs` having fallback code for one). `apps/console/Dockerfile`'s base image is Alpine
  // (`node:22.23.2-alpine3.24`), which is musl libc — `gcompat`/`libc6-compat` (already installed,
  // see that step's own comment) lets the glibc `.node` file physically `dlopen`, confirmed by
  // loading it directly, but `cbor-node`'s own loader (`native.mjs`) checks `isMusl()` BEFORE
  // attempting any native candidate and skips straight past every glibc variant when it's true —
  // which it genuinely is on Alpine (`readFileSync('/usr/bin/ldd')` mentions "musl", the OS is
  // structurally musl regardless of the compat shim). Net effect, reproduced against the real
  // built image on `linux/amd64` (this app's actual deployment target): `import('@cratestack/cbor')`
  // rejects with "Cannot find native binding" — see `server/authz-account-lookup.ts`'s `loadRpc`
  // comment for what that does to the usage-scope guard (fails closed, does not crash the route).
  // Predates this change entirely (same base image, same cratestack pin, since the Dockerfile's
  // first commit) — this migration didn't introduce it, and fixing it (a musl build from
  // cratestack upstream, or moving off Alpine) is a separate, larger decision than a bundler swap.
  serverExternalPackages: [
    '@cratestack/cbor',
    '@cratestack/cbor-node',
    '@cratestack/cbor-web',
    'esbuild-wasm',
  ],
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // The workspace packages ship raw TypeScript (`main: src/index.ts`), so Next has to compile
  // them itself. `@lightbridge/chart-core` is the DOM-free chart math package `ui-web` consumes
  // directly (ADR 0009 Decision 5) — the React Native UI package is no longer part of the
  // console's dependency graph at all.
  transpilePackages: ['@lightbridge/ui-web', '@lightbridge/chart-core', '@lightbridge/authz-rpc'],
  env: {
    // Busts the persisted IndexedDB query cache on every version bump — see
    // `src/client/query-persister.ts`. The app version is not a secret; nothing else about the
    // server's configuration is exposed to the browser.
    NEXT_PUBLIC_APP_VERSION: version,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
