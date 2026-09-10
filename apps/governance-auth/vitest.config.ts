import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * A single jsdom project: everything this app tests renders. There is no server half — this is a
 * static page a Rust binary embeds.
 *
 * `resolve.alias` restates `vite.config.ts`'s mapping because Vitest does not read the Vite
 * config of an app it is not building. Same mapping, same reason — see that file.
 */
export default defineConfig({
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
    name: 'governance-auth',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    // REQUIRED by the axe sweep that setup file installs (#443) — see
    // `packages/ui-web/src/test/a11y-sweep.ts`: under Vitest's default `'stack'` order, Testing
    // Library's auto-cleanup runs first and the sweep sees an empty `<body>`.
    sequence: { hooks: 'list' },
  },
});
