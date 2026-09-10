import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'typst-render',
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // A golden render shells out to the real `typst` binary; the default 5 s is too tight for a
    // cold first compile (font loading) on a busy machine.
    testTimeout: 40_000,
  },
});
