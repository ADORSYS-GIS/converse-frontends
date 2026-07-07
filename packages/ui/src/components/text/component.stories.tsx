import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { Text } from './component';

const meta: Meta<typeof Text> = {
  title: 'UI/Text',
  component: Text,
  args: {
    children: 'The quick brown fox jumps over the lazy dog',
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

const INTENTS = [
  'eyebrow',
  'title',
  'body',
  'bodyStrong',
  'key',
  'value',
  'caption',
  'link',
  'warning',
] as const;

export const AllIntents: Story = {
  render: (args) => (
    <Stack gap="sm">
      {INTENTS.map((intent) => (
        <Text key={intent} {...args} intent={intent}>
          {intent}: {args.children}
        </Text>
      ))}
    </Stack>
  ),
};

export const Aligned: Story = {
  render: (args) => (
    <Stack gap="sm" width="full">
      <Text {...args} align="left">
        Left aligned
      </Text>
      <Text {...args} align="center">
        Center aligned
      </Text>
      <Text {...args} align="right">
        Right aligned
      </Text>
    </Stack>
  ),
};
