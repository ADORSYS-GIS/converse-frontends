import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Two projects, split by what the unit under test actually needs.
 *
 * Most of this app's tests are server-side (session sealing, refresh decisions, proxy target
 * resolution, role/audience parsing) or pure (row mappers, the URL param contract), and none of
 * that touches the DOM — so `.test.ts` runs in `node`, as it always has.
 *
 * ADR 0011 adds the one thing that genuinely does need a DOM: the cross-zone claim that the URL is
 * the state bus is only meaningful when two *rendered* components exchange a param through it. Those
 * tests are `.test.tsx`, run in `jsdom`, and drive nuqs through its own testing adapter.
 *
 * `resolve.alias` below is the `dom` project's own counterpart to `tsconfig.json`'s
 * `@lightbridge/ui-web/src/*` path mapping — same reason, a different tool. Several `apps/console`
 * modules (e.g. `overview-centre.tsx`) import a `ui-web` component/section directly from its own
 * subpath (`@lightbridge/ui-web/src/components/button`) instead of the package barrel, to keep the
 * barrel's `d3`-backed chart re-exports out of routes that never render a chart. `ui-web`'s
 * `package.json` `exports` field (`"./src/*": "./src/*"`) advertises that subpath, and Next's own
 * bundler and `tsc` both resolve it — a directory target (`.../components/button`) falls through to
 * its `index.ts`. Vite's resolver, once a package declares `exports` at all, does NOT apply that
 * same directory-index fallback to a wildcarded subpath target — confirmed directly (`Failed to
 * resolve import "@lightbridge/ui-web/src/components/inline-status"`) before this alias was added;
 * every `.test.tsx` in this app that renders a container importing `ui-web` this way needs it.
 */
export default defineConfig({
  test: {
    // 15s, not vitest's 5s default: the heaviest centre tests (overview/projects/settings) render
    // the full dashboard composition and take ~4s on a warm laptop — on the cold `ubuntu-latest`
    // runner (no turbo remote cache, #134) they cross 5s and fail CI-only, taking the NEXT test in
    // the file down with leaked DOM ("found multiple elements"). Seen on main at 28a046d.
    testTimeout: 15_000,
    // converse-frontends#453: `server/reports/panel-svg.ts` loads the report chart renderer as a
    // prebuilt bundle (see `server/reports/render-charts.tsx` for why it cannot be compiled by
    // Next). Building it here means a fresh checkout can run `pnpm test` with no separate build
    // step, and that a test run can never be exercising a stale bundle.
    globalSetup: ['./src/test/build-report-charts-setup.ts'],
    // Root-level, unlike `testTimeout` above: Vitest resolves `sequence` from the ROOT config, not
    // per project (a `sequence` inside a `projects` entry is silently ignored — verified against
    // the `dom` project, where the axe sweep still saw a body Testing Library had already
    // emptied). See `packages/ui-web/src/test/a11y-sweep.ts` for why the order matters.
    sequence: { hooks: 'list' },
    projects: [
      {
        resolve: {
          // Same alias, same reason as the `dom` project below — `src/server/reports/*` imports
          // `@lightbridge/ui-web/src/lib/money` (the shared USD formatter) so a report and the
          // on-screen figures render money identically, and Vite will not resolve that wildcarded
          // subpath on its own.
          alias: [
            {
              find: /^@lightbridge\/ui-web\/src\/(.*)$/,
              replacement: path.resolve(currentDir, '../../packages/ui-web/src/$1'),
            },
          ],
        },
        test: {
          name: 'node',
          environment: 'node',
          // Root-level `testTimeout` is NOT inherited by `projects` entries (proven on main at
          // bdd5e34: CI still failed at "5000ms" with the root set to 15s) — it must sit in each
          // project. 15s covers the cold ubuntu-latest runner where the heavy centre renders
          // cross vitest's 5s default and leak DOM into the next test.
          testTimeout: 15_000,
          globals: true,
          include: ['src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: [
            {
              find: /^@lightbridge\/ui-web\/src\/(.*)$/,
              replacement: path.resolve(currentDir, '../../packages/ui-web/src/$1'),
            },
          ],
        },
        test: {
          name: 'dom',
          environment: 'jsdom',
          // See the `node` project's note — per-project on purpose, root is not inherited.
          testTimeout: 15_000,
          globals: true,
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
