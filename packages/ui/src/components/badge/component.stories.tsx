import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Badge } from './component';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: {
    children: 'Active',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

const TONES = ['neutral', 'brand', 'success', 'warning', 'error', 'info'] as const;

export const AllTones: Story = {
  render: () => (
    <Stack direction="row" gap="sm" wrap="wrap" align="center">
      {TONES.map((tone) => (
        <Badge key={tone} tone={tone}>
          {tone}
        </Badge>
      ))}
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack direction="row" gap="sm" align="center">
      <Badge tone="success" size="sm">
        Active
      </Badge>
      <Badge tone="success" size="md">
        Active
      </Badge>
    </Stack>
  ),
};
