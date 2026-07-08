import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { TextField } from '../text-field';
import { FormField } from './component';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  args: {
    label: 'Key name',
    children: <TextField placeholder="my-production-key" />,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Basic: Story = {};

export const WithDescription: Story = {
  args: { description: 'A human-friendly label to recognize this key later.' },
};

export const WithHelper: Story = {
  args: { helper: 'Use lowercase letters and dashes.' },
};

export const WithError: Story = {
  args: {
    error: 'A key with this name already exists.',
    children: <TextField value="production" />,
  },
};
