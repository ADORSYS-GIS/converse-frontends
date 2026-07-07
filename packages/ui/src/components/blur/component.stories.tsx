import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { Blur } from './component';

const meta: Meta<typeof Blur> = {
  title: 'UI/Blur',
  component: Blur,
  args: {
    intensity: 40,
    style: { width: 220, height: 120, padding: 16 },
    children: <Text intent="inverseBody">Blurred surface</Text>,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 260,
          height: 160,
          background:
            'linear-gradient(135deg, #1d5bff 0%, #7c3aed 50%, #f97316 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Blur>;

export const Default: Story = {};
export const RoundedLg: Story = { args: { radius: 'lg' } };
