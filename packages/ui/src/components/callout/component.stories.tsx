import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Callout } from './component';

const meta: Meta<typeof Callout> = {
  title: 'UI/Callout',
  component: Callout,
  args: {
    children: 'Keep your API keys secret. Anyone with a key can call the API as you.',
  },
};

export default meta;
type Story = StoryObj<typeof Callout>;

const TONES = ['neutral', 'info', 'success', 'warning', 'error'] as const;

export const AllTones: Story = {
  render: (args) => (
    <Stack gap="sm" style={{ width: 420 }}>
      {TONES.map((tone) => (
        <Callout key={tone} tone={tone}>
          {`${tone}: ${args.children}`}
        </Callout>
      ))}
    </Stack>
  ),
};
