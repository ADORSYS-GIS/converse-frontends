import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { Div } from './component';

const meta: Meta<typeof Div> = {
  title: 'UI/Div',
  component: Div,
  args: {
    pad: 'md',
    rounded: 'md',
    tone: 'surface',
    children: <Text>Content</Text>,
  },
};

export default meta;
type Story = StoryObj<typeof Div>;

export const Default: Story = {};
export const Muted: Story = { args: { tone: 'muted' } };
export const Brand: Story = { args: { tone: 'brand' } };
export const BrandSoft: Story = { args: { tone: 'brandSoft' } };
export const ErrorSoft: Story = { args: { tone: 'errorSoft' } };
export const SuccessSoft: Story = { args: { tone: 'successSoft' } };
export const Shadowed: Story = { args: { shadow: 'md' } };
export const RoundedFull: Story = { args: { rounded: 'full', size: 'iconLg', pad: 'none' } };

export const Pressable: Story = {
  args: {
    onPress: () => undefined,
  },
};
