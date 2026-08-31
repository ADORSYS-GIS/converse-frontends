import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * A single jsdom project: everything this scaffold tests renders. There is no server half here
 * (this app is a static SPA — no server code at all), so the two-project split
 * `apps/console/vitest.config.ts` needs has nothing to split.
 *
 * `resolve.alias` is the same mapping, for the same reason, as `vite.config.ts`'s and
 * `tsconfig.json`'s — see `vite.config.ts`'s comment. Vitest does not read the Vite config of an
 * app it is not building, so it must be stated here too.
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
    name: 'authz-ui',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
