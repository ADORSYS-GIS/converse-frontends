import React from 'react';
import type { Preview } from '@storybook/react-native-web-vite';

import '../global.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface-light',
      values: [
        { name: 'surface-light', value: '#ffffff' },
        { name: 'surface-dark', value: '#1f2937' },
      ],
    },
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
      const theme = context.globals.theme ?? 'light';
      return (
        <div className={theme === 'dark' ? 'dark' : ''} style={{ padding: 16 }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
