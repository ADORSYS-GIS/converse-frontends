import { createSerwistRoute } from '@serwist/turbopack';

/**
 * Serves the console's service worker (`src/sw.ts`, bundled with `esbuild-wasm`) and its sourcemap
 * from `/serwist/sw.js` / `/serwist/sw.js.map` — the Turbopack replacement for the file
 * `@serwist/next`'s webpack plugin used to emit at build time into `public/sw.js`.
 *
 * `middleware.ts`'s matcher exempts `serwist/` from the session guard (updated in the same change
 * that added this route — it used to exempt `sw.js` / `swe-worker-`, matching the old
 * `public/sw.js` filename): a service-worker fetch carries no session and must never be answered
 * with a login redirect, same as before. See `src/middleware.test.ts` before touching the matcher.
 *
 * `nextConfig` is required by `createSerwistRoute`'s schema, but `next.config.mjs` sets none of
 * `basePath`, `distDir` or `assetPrefix` (Next's own defaults apply), so this is `{}` rather than a
 * second hardcoded copy of values that would need to be kept in lockstep with that file. If
 * `next.config.mjs` ever sets any of those three, update this object to match.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: 'src/sw.ts',
    nextConfig: {},
  }
);
