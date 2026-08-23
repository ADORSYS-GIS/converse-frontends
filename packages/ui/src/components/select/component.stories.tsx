import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Select } from './component';
import type { SelectProps } from './types';

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

// A named function component, not an inline arrow assigned to `render`, so `useState` below is
// recognized as a Hook call inside a component (`react-hooks/rules-of-hooks` requires the
// enclosing function name to start with an uppercase letter or `use`; a `render:` story property
// doesn't qualify even though Storybook treats it as one).
function InteractiveSelect(args: SelectProps) {
  const [value, setValue] = useState('');
  return <Select {...args} value={value} onValueChange={setValue} />;
}

export const Interactive: Story = {
  render: (args) => <InteractiveSelect {...args} />,
};
