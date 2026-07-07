import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { Page } from './component';

const meta: Meta<typeof Page> = {
  title: 'UI/Page',
  component: Page,
  args: {
    children: <Text>Page content</Text>,
  },
};

export default meta;
type Story = StoryObj<typeof Page>;

export const Muted: Story = { args: { tone: 'muted' } };
export const Surface: Story = { args: { tone: 'surface' } };
