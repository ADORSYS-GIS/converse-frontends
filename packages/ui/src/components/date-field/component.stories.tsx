import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { DateField } from './component';

const meta: Meta<typeof DateField> = {
  title: 'UI/DateField',
  component: DateField,
  args: {
    accessibilityLabel: 'Expiration date',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DateField>;

export const Empty: Story = {};

export const WithValue: Story = {
  args: { value: '2026-12-31' },
};

export const WithMinToday: Story = {
  args: { min: new Date().toISOString().slice(0, 10) },
};

export const Disabled: Story = {
  args: { value: '2026-12-31', disabled: true },
};

// A named PascalCase component (not an inline arrow assigned to `render`) so the
// `react-hooks/rules-of-hooks` lint rule recognizes `useState` below as a legitimate hook call.
function InteractiveDateField(args: React.ComponentProps<typeof DateField>) {
  const [value, setValue] = useState('');
  return <DateField {...args} value={value} onValueChange={setValue} />;
}

export const Interactive: Story = {
  render: InteractiveDateField,
};
