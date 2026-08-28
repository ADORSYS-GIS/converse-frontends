import { createRequire } from 'node:module';

import withSerwistInit from '@serwist/next';

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
 * The console runs **Turbopack in development and webpack for the production build**
 * (`package.json`: `dev: next dev --turbopack`, `build:web: next build --webpack`). That split is
 * deliberate, and each half has exactly one reason.
 *
 * **Production stays on webpack** because `@serwist/next` — the stable Serwist integration, and the
 * thing that compiles `src/sw.ts` into `public/sw.js` — is a webpack plugin. Turbopack never calls
 * the `webpack()` config function at all, so under Turbopack the service worker would simply never
 * be built. In development that is a non-issue: ADR 0009 Decision 7 disables the service worker
 * there anyway (`disable` below), so `withSerwist` is already a no-op under `next dev`.
 *
 * **Development moved to Turbopack** once the blocker that used to pin it to webpack was removed at
 * the source. `packages/authz-rpc/generated/` is emitted by `cratestack generate-typescript` in the
 * NodeNext convention, importing its siblings as `./runtime.js` for `runtime.ts`. `tsc`, vitest,
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
 * Measured on the branch that made the switch (medians of 3 cold runs): first compile of `/` 6.37s
 * -> 1.86s, `/manage` 2.00s -> 0.44s, edit-to-rebuilt 200ms -> 71ms, first `/manage` after a warm
 * restart 5.22s -> 2.50s, dev JS+CSS served per page load 13.6 MiB -> 9.1 MiB. The webpack profile
 * said why: on a cold `/`, `next-flight-client-module-loader + next-swc-loader` was 17.5s of the
 * 18.9s of server-compilation loader time — SWC transpiling ~1480 server and ~1190 client modules,
 * which is precisely the work Turbopack does in Rust. See apps/console/README.md for the tables.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // ADR 0009 Decision 7: the service worker is a production concern. In development it would serve
  // a stale precached shell over every edit.
  disable: process.env.NODE_ENV !== 'production',
  reloadOnOnline: false,
});

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

export default withSerwist(nextConfig);
