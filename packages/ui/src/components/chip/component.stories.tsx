import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Chip } from './component';

const meta: Meta<typeof Chip> = {
  title: 'UI/Chip',
  component: Chip,
  args: {
    children: 'owner@example.com',
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Plain: Story = {};

export const Removable: Story = {
  args: {
    onRemove: () => undefined,
    removeAccessibilityLabel: 'Remove owner@example.com',
  },
};

export const Group: Story = {
  render: () => (
    <Stack direction="row" gap="sm" wrap="wrap">
      {['owner@example.com', 'admin@example.com', 'dev@example.com'].map((owner) => (
        <Chip key={owner} onRemove={() => undefined} removeAccessibilityLabel={`Remove ${owner}`}>
          {owner}
        </Chip>
      ))}
    </Stack>
  ),
};
