import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';

import '../src/styles.css';

// apps/console runs dark-only at launch (ADR 0009 Decision 5) — this Storybook
// has no theme toggle. Stories render on the floor (`bg-muted`), matching the
// console shell: "content is the floor; chrome floats above it."
const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: false },
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
