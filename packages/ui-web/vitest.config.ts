import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // REQUIRED by the axe sweep the setup file installs, not a style preference. Vitest's default
    // (`'stack'`) runs `afterEach` hooks in REVERSE registration order, which puts Testing
    // Library's auto-`cleanup` — registered when a test file imports it, i.e. after this setup
    // file — ahead of the sweep, so the sweep would always find an empty `<body>` and pass
    // everything silently. See `src/test/a11y-sweep.ts` for the measurement that proved it.
    sequence: { hooks: 'list' },
  },
});
