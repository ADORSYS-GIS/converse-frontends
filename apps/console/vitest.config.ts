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
    projects: [
      {
        resolve: {
          // Same alias, same reason as the `dom` project below — `src/server/consumption-pdf.ts`
          // imports `@lightbridge/ui-web/src/lib/money` (the shared USD formatter) so the PDF
          // report and the on-screen figures render money identically, and Vite will not resolve
          // that wildcarded subpath on its own.
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
          globals: true,
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
