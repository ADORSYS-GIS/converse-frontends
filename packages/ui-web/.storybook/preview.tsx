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
  base390: { name: 'Base — 390 (<600)', styles: { width: '390px', height: '844px' }, type: 'mobile' as const },
  md900: { name: 'md — 900 (600–1024)', styles: { width: '900px', height: '760px' }, type: 'tablet' as const },
  lg1440: { name: 'lg — 1440 (≥1024)', styles: { width: '1440px', height: '900px' }, type: 'desktop' as const },
};

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: false },
    viewport: { options: CONSOLE_VIEWPORTS },
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
        <div data-theme={theme} className="bg-muted min-h-screen">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
