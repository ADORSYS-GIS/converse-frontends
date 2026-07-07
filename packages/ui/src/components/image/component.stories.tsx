import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Image } from './component';

const SAMPLE_URI = 'https://picsum.photos/id/1015/240/240';

const meta: Meta<typeof Image> = {
  title: 'UI/Image',
  component: Image,
  args: {
    source: { uri: SAMPLE_URI },
    style: { width: 160, height: 160 },
  },
};

export default meta;
type Story = StoryObj<typeof Image>;

export const Square: Story = { args: { radius: 'none' } };
export const RoundedMd: Story = { args: { radius: 'md' } };
export const RoundedFull: Story = { args: { radius: 'full' } };
