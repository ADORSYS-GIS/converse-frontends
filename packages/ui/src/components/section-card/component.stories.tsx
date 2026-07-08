import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from '../button';
import { Stack } from '../stack';
import { Text } from '../text';
import { SectionCard } from './component';

const meta: Meta<typeof SectionCard> = {
  title: 'UI/SectionCard',
  component: SectionCard,
  args: {
    title: 'Billing identity',
    description: 'The name shown on invoices for this account.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 460 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SectionCard>;

export const Default: Story = {
  args: {
    children: <Text>Section content goes here.</Text>,
  },
};

export const WithAction: Story = {
  args: {
    action: <Button size="sm">Edit</Button>,
    children: <Text>Section content goes here.</Text>,
  },
};

export const Muted: Story = {
  args: {
    tone: 'muted',
    title: 'Cross-project policies',
    description: 'Not yet supported by the backend.',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Danger zone',
    description: 'Deleting the account is permanent and cannot be undone.',
    children: (
      <Stack align="start">
        <Button variant="neutral" size="sm">
          Delete account
        </Button>
      </Stack>
    ),
  },
};
