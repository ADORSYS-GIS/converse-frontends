// Pre-`next build` step (converse-frontends#453): bundle the report's chart renderer into ONE
// dependency-free CommonJS file that Next never compiles.
//
// See `src/server/reports/render-charts.tsx` for the full reasoning. The short version: a Next
// Route Handler runs in the react-server layer, where `react-dom/server`'s `renderToStaticMarkup`
// is aliased to a function that throws, and where any module reaching `useState`/`useEffect` is a
// build error. The report's charts are the `ui-web` components the page draws — interactive by
// design, and rendered here in their `static` mode — so they cannot live in that layer. Bundling
// them out of it is what lets the report and the screen keep ONE chart implementation.
//
// The output is deliberately self-contained (`react`, `react-dom/server`, `d3-*`,
// `@lightbridge/ui-web` and `@lightbridge/chart-core` all inlined, `external: []`). That is what
// makes shipping it a single `COPY` in the Dockerfile and a single `createRequire` at runtime,
// with no package resolution, no `serverExternalPackages` entry and nothing for Next's standalone
// tracer to miss — the failure mode `@cratestack/cbor` already hit in this app.
//
// Run by:
//   - `pnpm --filter console build:web` (this script, then `next build`),
//   - the repo's root `postinstall`, so a fresh checkout can run `pnpm test` without a build step,
//   - `vitest.config.ts`'s `globalSetup`, so a test run is never silently exercising a stale bundle.

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const consoleRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export const ENTRY = join(consoleRoot, 'src/server/reports/render-charts.tsx');
export const OUT_FILE = join(consoleRoot, 'report-charts/render.cjs');

export async function buildReportCharts() {
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  await build({
    entryPoints: [ENTRY],
    outfile: OUT_FILE,
    bundle: true,
    platform: 'node',
    // CJS so `createRequire` can load it synchronously from an ESM Next route without a dynamic
    // `import()` whose specifier Turbopack might still try to resolve.
    format: 'cjs',
    target: 'node22',
    // NOTHING external. See the header: one file, zero resolution.
    external: [],
    // `production` picks React's own production builds, which is what a server render wants —
    // and, more importantly, keeps the dev-only `useLayoutEffect`-on-the-server warning out of a
    // process where it would fire on every export.
    define: { 'process.env.NODE_ENV': '"production"' },
    jsx: 'automatic',
    minify: false,
    sourcemap: false,
    logLevel: 'warning',
  });
  return OUT_FILE;
}

// `import.meta.main` is Node 24+; this comparison is the portable form and is also what lets
// `vitest.config.ts` import this module for its own `globalSetup` without triggering a build twice.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildReportCharts();
  console.log(`[console] report chart renderer -> ${OUT_FILE}`);
}
