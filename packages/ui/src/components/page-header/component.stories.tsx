import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from '../button';
import { PageHeader } from './component';

const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
  args: {
    title: 'API Keys',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const TitleOnly: Story = {};

export const WithSubtitle: Story = {
  args: { subtitle: 'Manage keys for the current project' },
};

export const WithLeadingAndTrailing: Story = {
  args: {
    leading: (
      <Button variant="ghost" size="iconSm">
        ‹
      </Button>
    ),
    trailing: <Button size="sm">New key</Button>,
  },
};
