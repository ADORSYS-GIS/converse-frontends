import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Text } from '../text';
import { Divider } from './component';

const meta: Meta<typeof Divider> = {
  title: 'UI/Divider',
  component: Divider,
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  render: () => (
    <Stack gap="md" width="full" style={{ width: 280 }}>
      <Text>Above</Text>
      <Divider />
      <Text>Below</Text>
    </Stack>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center" style={{ height: 40 }}>
      <Text>Left</Text>
      <Divider orientation="vertical" />
      <Text>Right</Text>
    </Stack>
  ),
};
