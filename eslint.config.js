const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `storybook-static/*` and `packages/*/storybook-static/*` only match a build output sitting
    // directly at those depths -- they don't match one nested inside a local, uncommitted worktree
    // checkout (e.g. `.claude/worktrees/<name>/packages/ui/storybook-static/`). ESLint's stylish
    // formatter chokes on results from those huge generated bundles with a `RangeError: Invalid
    // string length`, which crashes `pnpm lint` outright rather than reporting findings -- so both
    // patterns are recursive (`**/`) here, and the worktree directory itself is ignored outright
    // regardless of what it contains.
    ignores: [
      'dist/*',
      'apps/*/dist/*',
      // Next.js build output. `apps/console/.next/types/**` is generated route-type scaffolding
      // that trips a dozen `@typescript-eslint` rules it was never written to satisfy — same
      // reasoning as the `dist`/`storybook-static` entries around it.
      '**/.next/**',
      'storybook-static/*',
      'packages/*/storybook-static/*',
      '.claude/worktrees/**',
      '**/storybook-static/**',
    ],
  },
  {
    rules: {
      'react/display-name': 'off',
    },
  },
  {
    // `apps/authz-ui` imports `virtual:pwa-register` (vite-plugin-pwa) -- a bundler-virtual
    // specifier that only exists once Vite's dev server or build resolves it; there is no file
    // on disk for any resolver to find. `tsc` accepts it because the app's `tsconfig.json`
    // `types` array includes `vite-plugin-pwa/client`, whose ambient `declare module
    // 'virtual:pwa-register'` types the import -- confirmed by `tsc --noEmit -p
    // apps/authz-ui/tsconfig.json` passing clean. `eslint-import-resolver-typescript` does not
    // replicate that resolution (it resolves per-file, not through a full `tsc` program, so a
    // `types`-only ambient declaration never reaching `include` is invisible to it), so
    // `import/no-unresolved` reports a false positive here. Same shape as this file's own
    // `import/ignore` entry for react-native's Flow-typed main module just above -- a specifier
    // family that is real and correct but that no static resolver can walk to.
    files: ['apps/authz-ui/**/*.{ts,tsx}'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
    },
  },
]);
