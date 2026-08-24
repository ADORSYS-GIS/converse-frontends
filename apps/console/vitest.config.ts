import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Every unit under test here is server-side (session sealing, refresh decisions, proxy target
    // resolution, role/audience parsing). None of it touches the DOM, so no jsdom.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
