const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const jsxA11y = require('eslint-plugin-jsx-a11y');

/**
 * The DOM surfaces. `eslint-plugin-jsx-a11y` reasons about HTML element names and ARIA — it is
 * meaningless (and noisy) against React Native JSX, where `<View onPress>` is not a `<div
 * onClick>`. Every workspace holding a `.tsx` file today is a DOM surface (the Expo half,
 * `packages/ui` + `apps/self-service`, was removed in #368), so this list is currently exhaustive;
 * it is written out rather than globbed to `**` precisely so that a future React Native workspace
 * does not silently inherit rules written for the browser.
 */
const DOM_SURFACES = [
  'apps/authz-ui/**/*.{js,jsx,ts,tsx}',
  'apps/console/**/*.{js,jsx,ts,tsx}',
  'apps/governance-auth/**/*.{js,jsx,ts,tsx}',
  'apps/lci/**/*.{js,jsx,ts,tsx}',
  'packages/ui-web/**/*.{js,jsx,ts,tsx}',
];

module.exports = defineConfig([
  expoConfig,
  {
    // Accessibility is a GATE, not a panel (owner directive 2026-09-03, issue #443). This is the
    // static half of the stack; the runtime halves are the axe assertions in every render test
    // (`packages/ui-web/src/test/a11y.ts`) and `parameters.a11y.test = 'error'` in Storybook.
    // See `docs/knowledge/accessibility.md`.
    //
    // `flatConfigs.recommended` already sets every rule it enables to `error`, so there is no
    // severity to raise — what this block adds is the two rules `recommended` deliberately leaves
    // `off` that this console DOES want, plus the one it leaves off that stays off:
    //
    //  - `control-has-associated-label` → error. This is the icon-only-button rule. The console is
    //    full of them (`RowActionGroup`, `ConsoleTopBar`, `SecretReveal`, chart toolbars), and an
    //    unlabelled one is invisible to a screen reader. `ignoreElements`/`ignoreRoles` are left at
    //    the plugin's own defaults.
    //  - `anchor-ambiguous-text` → error. "Click here"/"read more" link text. Cheap to hold now,
    //    expensive to retrofit.
    //  - `label-has-for` stays off: it is deprecated upstream and fully superseded by
    //    `label-has-associated-control`, which `recommended` already errors on.
    files: DOM_SURFACES,
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // `[1]` is the plugin's own default option object (`ignoreElements`/`ignoreRoles`/
      // `includeRoles`), which `recommended` ships alongside the `off` severity. Writing a bare
      // `'error'` here would DROP it and re-enable the rule with `ignoreElements: []` — which
      // makes it fire on every `<input>`/`<textarea>` that already has a `<label htmlFor>`.
      // Verified: that mistake produced 4 false positives (`field`, `device-code-entry`) that
      // vanish once the options are carried across.
      'jsx-a11y/control-has-associated-label': [
        'error',
        jsxA11y.flatConfigs.recommended.rules['jsx-a11y/control-has-associated-label'][1],
      ],
      'jsx-a11y/anchor-ambiguous-text': 'error',
    },
  },
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
      // Codegen output, not hand-authored: `cratestack generate-typescript` for authz-rpc and
      // `openapi-ts` for api-rest. These regenerate on every `pnpm install` (postinstall), so
      // linting them reports findings against nobody's actual source and drowns out real
      // warnings — 106 of the 145 problems on a clean baseline came from these two directories
      // alone.
      'packages/authz-rpc/generated/**',
      'packages/api-rest/src/client/**',
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
    // `import/no-unresolved` reports a false positive here. Same shape as the `import/ignore`
    // entry `eslint-config-expo/flat` itself carries for react-native's Flow-typed main module
    // (its utils/core.js) -- a specifier that is real and correct but that no static resolver
    // can walk to. Verified live at HEAD: removing this block makes
    // `eslint apps/authz-ui/**/*.{ts,tsx}` report `Unable to resolve path to module
    // 'virtual:pwa-register'`, so this is a working suppression, not residue.
    files: ['apps/authz-ui/**/*.{ts,tsx}'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^virtual:pwa-register$'] }],
    },
  },
]);
