import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { Card } from './component';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  args: {
    children: <Text>Card content</Text>,
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Medium: Story = { args: { size: 'md' } };
export const Small: Story = { args: { size: 'sm' } };
export const Pressable: Story = { args: { size: 'md', onPress: () => undefined } };
