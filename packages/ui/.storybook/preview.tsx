import React from 'react';
import type { Preview } from '@storybook/react-native-web-vite';

import '../global.css';

// The app renders on the `muted` page background, not pure white, so surface-toned
// components (white cards, nav bars) only have contrast against muted. Paint the
// canvas with the muted token per theme so stories look the way they do in the app,
// and flip both the background and the `.dark` class from the one theme toggle.
const MUTED_BG = { light: '#f7f7f8', dark: '#000000' } as const;

const preview: Preview = {
  parameters: {
    // The decorator owns the background so it can track the theme toggle.
    backgrounds: { disable: true },
    controls: { expanded: false },
  },
  globalTypes: {
    theme: {
      description: 'Light / dark theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const isDark = (context.globals.theme ?? 'light') === 'dark';
      return (
        <div
          className={isDark ? 'dark' : ''}
          style={{
            background: isDark ? MUTED_BG.dark : MUTED_BG.light,
            padding: 24,
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
