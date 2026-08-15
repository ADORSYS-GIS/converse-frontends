import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Avatar } from './component';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  args: {
    name: 'Ada Lovelace',
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Initials: Story = {};

export const SingleName: Story = {
  args: { name: 'Cher' },
};

export const WithImage: Story = {
  args: {
    name: 'Grace Hopper',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces',
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack direction="row" gap="sm" align="center">
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Ada Lovelace" size="md" />
      <Avatar name="Ada Lovelace" size="lg" />
      <Avatar name="Ada Lovelace" size="xl" />
    </Stack>
  ),
};
