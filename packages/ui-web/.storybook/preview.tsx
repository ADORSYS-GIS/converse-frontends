import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';

import '../src/styles.css';

// ADR 0010 Decision 5: `black` (dark) is default, `wireframe` (light) is a first-class toggle —
// this replaced the old dark-only `.dark` class decorator. Colour is theme-variable driven
// (`data-theme` on the iframe root), never a `dark:`/`.dark` class (console-ui skill "Light theme
// rules" — a `dark:` class cannot follow `data-theme`).
type ConsoleTheme = 'black' | 'wireframe';

// Custom viewport presets matching the mobile-first ladder (ADR 0009 Decision 6, console-ui
// skill "Shape and layout" / `theme.css`'s `--breakpoint-md`/`-lg`). Since `ConsoleShell` and the
// page views are CSS-driven (`md:`/`lg:` Tailwind classes, not a JS `tier` prop), a story only
// exercises a given tier by actually resizing the Storybook preview iframe via these — a
// fixed-width wrapper `<div>` has no effect on a real `@media` query.
const CONSOLE_VIEWPORTS = {
  base390: {
    name: 'Base — 390 (<600)',
    styles: { width: '390px', height: '844px' },
    type: 'mobile' as const,
  },
  md900: {
    name: 'md — 900 (600–1024)',
    styles: { width: '900px', height: '760px' },
    type: 'tablet' as const,
  },
  lg1440: {
    name: 'lg — 1440 (≥1024)',
    styles: { width: '1440px', height: '900px' },
    type: 'desktop' as const,
  },
};

const preview: Preview = {
  parameters: {
    // Accessibility is a GATE, not a panel (owner directive 2026-09-03, issue #443). `'error'`
    // makes every story's axe run a FAILING test under `pnpm --filter @lightbridge/ui-web
    // test:a11y` (`vitest.storybook.config.ts`) as well as a red badge in the addon panel;
    // `'todo'` — the addon's own suggested first step — would leave violations as warnings nobody
    // has to act on, which is the panel this directive replaced.
    //
    // Note the rule set differs from the jsdom sweep on purpose: this runs in real Chromium, so
    // `color-contrast` is ENABLED here and is the only place in the repo that can measure it. Both
    // themes are covered by the two projects in that config, not by per-story light variants.
    a11y: { test: 'error' },
    backgrounds: { disable: true },
    controls: { expanded: false },
    viewport: { options: CONSOLE_VIEWPORTS },
    // The sidebar's reading order, top-down: what a thing is made of, then what it is made into,
    // then where it ships. Plain alphabetical put `Charts` above `Dashboard` above `Foundations`
    // above `Pages`, which reads as noise; this pins the roots (and the second level where it
    // matters) and lets everything unnamed fall through alphabetically after them.
    //
    // `Legacy` is last on purpose — `src/refine-mock/` is #472 class B (referenced only by its own
    // stories) and awaiting an owner ruling on deletion. It stays browsable; it stops competing
    // for attention with the live tree.
    //
    // **Written out inline, not hoisted to a `const`.** Storybook statically analyses this file
    // and rejects an identifier here ("Parameter 'options.storySort' should be defined inline") —
    // `build-storybook` fails outright, so this is not a style choice. The roots below are
    // asserted against `scripts/storybook-taxonomy.mjs`'s `TAXONOMY_ROOTS` by
    // `src/story-taxonomy.test.ts`, which is what keeps the two lists from drifting.
    //
    // Full map + the rules for adding a story: `packages/ui-web/STORYBOOK.md`.
    options: {
      storySort: {
        method: 'alphabetical',
        order: [
          'Foundations',
          'Primitives',
          ['Actions', 'Fields', 'Overlays', 'Data', 'States'],
          'Charts',
          'Shell',
          'Dashboard',
          'Sections',
          ['Account', 'Usage', 'Budget', 'Admin', 'Auth', 'Settings'],
          'Pages',
          ['Account', 'Settings', 'Admin', 'Auth', 'LCI', 'Platform'],
          'LCI',
          'Legacy',
        ],
      },
    },
  },
  // A toolbar entry (Storybook's `globalTypes`) rather than a fixed decorator: reviewers switch
  // `black`/`wireframe` per the phase-4 acceptance surface without editing a story.
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Console theme (ADR 0010 Decision 5)',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'black', title: 'black (dark)' },
          { value: 'wireframe', title: 'wireframe (light)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  // Default every story to the `lg` (≥1024) viewport and the `black` (dark, default) theme so
  // existing/unmodified stories keep rendering their intended look without opting in; mobile-first
  // and light-variant stories override these per-story with `globals: { viewport: {...}, theme:
  // 'wireframe' }`.
  globals: {
    viewport: { value: 'lg1440' },
    theme: 'black' satisfies ConsoleTheme,
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as ConsoleTheme | undefined) ?? 'black';

      // `<html>` is the ONLY element this decorator ever sets `data-theme` on — matching exactly
      // what `apps/console`'s pre-hydration script and theme toggle do (a single source of truth
      // per ADR 0010 Decision 5). An earlier version of this decorator ALSO put `data-theme` on
      // the wrapping `<div>` below, as a second, redundant copy. That div's own attribute only
      // ever changed when THIS effect ran (i.e. when Storybook's own toolbar changed
      // `context.globals.theme`), so anything that set `<html data-theme>` by another means --
      // manual devtools, or an external check reproducing exactly what the no-flash script does --
      // desynced the two: `<html>` had the new theme, the div still had the stale one, and because
      // a `[data-theme]` selector matches ANY element bearing the attribute (not just `<html>`),
      // the div's stale value won for its entire subtree. Fixed in `theme.css` too (see its
      // trailing `@theme` block's "Regression, found and fixed" comment) — this decorator is the
      // other half of that fix: one source of truth, not two.
      useEffect(() => {
        document.documentElement.dataset.theme = theme;
      }, [theme]);

      // No padding here (owner finding, 2026-08-25): full-page stories (`layout: 'fullscreen'`)
      // must render edge-to-edge — rails are flush against the iframe sides (console-ui skill
      // "Rails are flush, aligned, full-height columns"), and a global inset here fought that on
      // every page/shell story. Storybook's own default `layout: 'padded'` already gives
      // isolated component stories breathing room; a component story that genuinely needs more
      // gets its own local decorator, never a global one.
      return (
        <div className="bg-muted min-h-screen">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
