import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Div } from '../div';
import { Stack } from '../stack';
import { Spinner } from './component';

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </Stack>
  ),
};

export const Tones: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center">
      <Spinner tone="brand" />
      <Spinner tone="neutral" />
      <Div tone="brand" pad="md" rounded="md">
        <Spinner tone="inverse" />
      </Div>
    </Stack>
  ),
};
