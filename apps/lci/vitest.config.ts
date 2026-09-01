import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const uiWebAlias = {
  find: /^@lightbridge\/ui-web\/src\/(.*)$/,
  replacement: path.resolve(currentDir, '../../packages/ui-web/src/$1'),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: [uiWebAlias] },
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          include: ['src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias: [uiWebAlias] },
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
