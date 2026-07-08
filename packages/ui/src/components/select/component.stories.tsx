import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Select } from './component';

const OPTIONS = [
  { label: 'Read only', value: 'read' },
  { label: 'Read & write', value: 'read-write' },
  { label: 'Admin', value: 'admin' },
];

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  args: {
    options: OPTIONS,
    placeholder: 'Select a scope',
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
type Story = StoryObj<typeof Select>;

export const Placeholder: Story = {};

export const WithValue: Story = {
  args: { value: 'read-write' },
};

export const Disabled: Story = {
  args: { value: 'admin', disabled: true },
};

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState('');
    return <Select {...args} value={value} onValueChange={setValue} />;
  },
};
