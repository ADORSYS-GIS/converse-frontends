import { createSerwistRoute } from '@serwist/turbopack';

/**
 * Serves this app's service worker (`src/sw.ts`, bundled with `esbuild-wasm`) and its sourcemap
 * from `/serwist/sw.js` / `/serwist/sw.js.map` — the Turbopack way of shipping a service worker,
 * with no build-time webpack plugin and no file emitted into `public/`.
 *
 * `src/proxy.ts`'s matcher exempts `serwist/` from the session guard: a service-worker fetch
 * carries no session and must never be answered with a login redirect. See
 * `src/shared/uncacheable-paths.ts` for the paths the worker itself must never cache.
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
