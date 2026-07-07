import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { TextField } from './component';

const meta: Meta<typeof TextField> = {
  title: 'UI/TextField',
  component: TextField,
  args: {
    placeholder: 'name@example.com',
  },
};

export default meta;
type Story = StoryObj<typeof TextField>;

export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
export const WithValue: Story = { args: { value: 'acme-inc' } };
