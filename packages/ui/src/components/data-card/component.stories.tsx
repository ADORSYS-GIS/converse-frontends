import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Avatar } from '../avatar';
import { Badge } from '../badge';
import { Button } from '../button';
import { DataCard } from './component';

const meta: Meta<typeof DataCard> = {
  title: 'UI/DataCard',
  component: DataCard,
  args: {
    title: 'Production key',
    subtitle: 'sk_live_••••8f2a',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataCard>;

export const Default: Story = {
  args: {
    status: <Badge tone="success">Active</Badge>,
    items: [
      { label: 'Environment', value: 'Production' },
      { label: 'Created', value: 'Jul 2, 2026' },
      { label: 'Last used', value: '2 hours ago' },
      { label: 'Requests (24h)', value: '4,208' },
    ],
  },
};

export const WithAvatarAndActions: Story = {
  args: {
    title: 'Personal projects',
    subtitle: '12 members',
    leading: <Avatar name="Personal projects" size="md" />,
    trailing: (
      <Button variant="ghost" size="sm">
        Manage
      </Button>
    ),
    items: [
      { label: 'Plan', value: 'Team' },
      { label: 'Region', value: 'eu-central' },
    ],
  },
};

export const Muted: Story = {
  args: {
    tone: 'muted',
    title: 'Revoked key',
    subtitle: 'sk_test_••••11c4',
    status: <Badge tone="neutral">Revoked</Badge>,
  },
};

export const Pressable: Story = {
  args: {
    title: 'Open the docs project',
    subtitle: 'Last deploy 3 days ago',
    onPress: () => undefined,
    items: [{ label: 'Status', value: 'Healthy' }],
  },
};
