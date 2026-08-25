import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

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
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          include: ['src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
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
