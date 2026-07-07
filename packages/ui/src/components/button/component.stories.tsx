import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from './component';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Continue',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary' } };
export const BrandSoft: Story = { args: { variant: 'brandSoft' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Neutral: Story = { args: { variant: 'neutral' } };
export const Icon: Story = { args: { variant: 'icon', size: 'icon', shape: 'circle', children: '★' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };
export const FullWidth: Story = { args: { variant: 'primary', width: 'full' } };

export const Sizes: Story = {
  render: (args) => (
    <>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </>
  ),
};
