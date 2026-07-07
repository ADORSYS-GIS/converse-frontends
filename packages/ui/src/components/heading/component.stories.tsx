import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Heading } from './component';

const meta: Meta<typeof Heading> = {
  title: 'UI/Heading',
  component: Heading,
  args: {
    children: 'Account settings',
  },
};

export default meta;
type Story = StoryObj<typeof Heading>;

export const Title: Story = { args: { tone: 'title' } };
export const Subtitle: Story = { args: { tone: 'subtitle', children: 'Manage billing and access' } };

export const Both: Story = {
  render: () => (
    <Stack gap="xs">
      <Heading tone="title">Account settings</Heading>
      <Heading tone="subtitle">Manage billing and access</Heading>
    </Stack>
  ),
};
