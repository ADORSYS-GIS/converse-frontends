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
]);
