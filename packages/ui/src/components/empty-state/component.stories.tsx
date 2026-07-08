import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from '../button';
import { Card } from '../card';
import { EmptyState } from './component';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: {
    title: 'No API keys yet',
    description: 'Create your first key to start calling the API.',
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: <Button size="sm">Create key</Button>,
  },
};

export const InCard: Story = {
  render: (args) => (
    <Card size="md" style={{ width: 420 }}>
      <EmptyState {...args} action={<Button size="sm">Create key</Button>} />
    </Card>
  ),
};
