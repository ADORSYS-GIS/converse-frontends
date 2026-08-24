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
 * The console builds with **webpack**, not Next 16's default Turbopack. Two independent reasons,
 * both load-bearing:
 *
 * 1. `packages/authz-rpc/generated/` is emitted by `cratestack generate-typescript` as ESM
 *    TypeScript importing its siblings with explicit `.js` specifiers (`./runtime.js` for
 *    `runtime.ts`) — the NodeNext convention. `tsc`, vitest and Metro all resolve that; Turbopack
 *    has no equivalent of webpack's `resolve.extensionAlias` and fails with
 *    "Can't resolve './stream-terminal.js'". The files are generated, so the imports cannot be
 *    fixed at the source.
 * 2. `@serwist/next`, the stable Serwist integration, is a webpack plugin.
 *
 * Revisit when cratestack emits extensionless specifiers or Turbopack grows `extensionAlias`.
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
  // The workspace packages ship raw TypeScript (`main: src/index.ts`), so Next has to compile
  // them itself. `@lightbridge/ui` is here only for `ui-web`'s DOM-free `chart-core` deep imports
  // (ADR 0009 Decision 5) — no React Native module is ever reached from the console.
  transpilePackages: ['@lightbridge/ui-web', '@lightbridge/ui', '@lightbridge/authz-rpc'],
  experimental: {
    // Reason 1 above: map the generated client's NodeNext `.js` specifiers onto the `.ts` sources.
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
  },
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
