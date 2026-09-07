/**
 * Response headers applied to every route — same narrow set `apps/console`'s own next.config.mjs
 * applies (ADR 0009 Decision 3's reasoning): this app is the only exposed origin for LCI's UI, so
 * it never needs to be framed, sniffed, or referrer-leaked into a third party.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ships as a Node-runtime container, per #287's pattern for a converse app — server route
  // handlers decrypt the session cookie and proxy to the control plane, so it needs `next
  // start`'s Node server, not a static export.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // ── OpenTelemetry (`src/instrumentation.node.ts` -> `@lightbridge/otel/start`) must stay
  // UNBUNDLED, for two independent reasons — the same two `apps/console/next.config.mjs` records
  // at length:
  //
  //  1. `@opentelemetry/instrumentation-http` patches Node's `http`/`https` through
  //     `require-in-the-middle`, which hooks module RESOLUTION; inlined code never reaches a
  //     resolver, so a bundled instrumentation patches nothing and drops every server span with no
  //     error anywhere.
  //  2. `@opentelemetry/api` holds the global tracer provider in module state, and Next's own
  //     render/route spans go through its copy — app and framework must resolve to ONE instance.
  //
  // Listing them here is also what pulls the real files into the standalone output the container
  // image ships.
  serverExternalPackages: [
    // `@serwist/turbopack`'s `createSerwistRoute` (`src/app/serwist/[path]/route.ts`) spawns
    // `esbuild-wasm`'s own `bin/esbuild` as a child process at request time. Left un-externalized,
    // Next traces and inlines that `require()` the same way it would any other server-route
    // import, which breaks the WASM loader's own path resolution (`Error: Cannot find module
    // '.../esbuild-wasm/bin/esbuild'`, `Error: The service was stopped`) — the package has to stay
    // a real on-disk dependency, not something Next tries to bundle.
    'esbuild-wasm',
    '@opentelemetry/api',
    '@opentelemetry/core',
    '@opentelemetry/exporter-trace-otlp-proto',
    '@opentelemetry/instrumentation',
    '@opentelemetry/instrumentation-http',
    '@opentelemetry/instrumentation-undici',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-node',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/semantic-conventions',
  ],
  // The workspace packages ship raw TypeScript (`main: src/index.ts`); Next has to compile them.
  // Only `@lightbridge/otel`'s OWN source is compiled — its `@opentelemetry/*` dependencies stay
  // external, per the block above.
  transpilePackages: ['@lightbridge/ui-web', '@lightbridge/otel'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
