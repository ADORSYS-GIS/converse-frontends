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
  // The workspace package ships raw TypeScript (`main: src/index.ts`); Next has to compile it.
  transpilePackages: ['@lightbridge/ui-web'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
