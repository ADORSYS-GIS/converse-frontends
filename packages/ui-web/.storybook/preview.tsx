import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';

import '../src/styles.css';

// apps/console runs dark-only at launch (ADR 0009 Decision 5) — this Storybook
// has no theme toggle. Stories render on the floor (`bg-muted`), matching the
// console shell: "content is the floor; chrome floats above it."
//
// Custom viewport presets matching the mobile-first ladder (ADR 0009 Decision 6, console-ui
// skill "Shape and layout" / `tailwind.config.js` `screens: { md: 600, lg: 1024 }`). Since
// `ConsoleShell` and the page views are now CSS-driven (`md:`/`lg:` Tailwind classes, not a JS
// `tier` prop), a story only exercises a given tier by actually resizing the Storybook preview
// iframe via these — a fixed-width wrapper `<div>` has no effect on a real `@media` query.
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
  // Default every story to the `lg` (≥1024) viewport so existing/unmodified stories keep
  // rendering their intended desktop layout without each one having to opt in; mobile-first
  // stories override this per-story with `globals: { viewport: { value: 'base390' } }` etc.
  globals: {
    viewport: { value: 'lg1440' },
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        document.documentElement.classList.add('dark');
      }, []);

      return (
        <div className="dark bg-muted min-h-screen p-6">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
