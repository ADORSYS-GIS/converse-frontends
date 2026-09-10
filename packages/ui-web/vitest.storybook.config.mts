import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import storybookTest from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vitest/config';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The BROWSER half of the accessibility gate (#443) — `pnpm --filter @lightbridge/ui-web test:a11y`.
 *
 * Every story in this Storybook (its own two roots: `packages/ui-web/src` and `apps/lci/src`) is
 * mounted in headless Chromium and audited by `@storybook/addon-a11y`, with
 * `parameters.a11y.test = 'error'` set project-wide in `.storybook/preview.tsx`. A violation is a
 * failing test, not a panel badge.
 *
 * ## Why this is a SEPARATE config and a separate script
 *
 * `vitest.config.ts` is the jsdom unit suite: ~1500 tests, no browser, seconds. This one needs a
 * real Chromium (Playwright), so folding it into `test` would put a browser download on the
 * critical path of every `pnpm test` — including the machines that only want to run one unit test.
 * The two run in different CI jobs for the same reason.
 *
 * ## Why TWO projects
 *
 * ADR 0010 Decision 5 gives the console two first-class themes, and the console-ui skill requires
 * every component to be "`addon-a11y`-clean in both". A story is rendered once per Vitest project,
 * so both themes means two projects differing only in `initialGlobals.theme` — the same toolbar
 * global `.storybook/preview.tsx`'s decorator reads to stamp `data-theme` on `<html>`. Relying on
 * per-story light variants instead would only cover the components that happen to have one.
 *
 * ## `color-contrast` is ON here
 *
 * This is the ONLY place in the repo that can compute it: a real engine, real layout, real
 * cascade. The jsdom sweep (`src/test/a11y.ts`) disables the rule because jsdom cannot resolve a
 * used colour value. Contrast findings therefore surface here or nowhere.
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          await storybookTest({
            configDir: join(HERE, '.storybook'),
            initialGlobals: { theme: 'black' },
          }),
        ],
        test: {
          name: 'storybook-a11y-black',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        plugins: [
          await storybookTest({
            configDir: join(HERE, '.storybook'),
            initialGlobals: { theme: 'wireframe' },
          }),
        ],
        test: {
          name: 'storybook-a11y-wireframe',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
