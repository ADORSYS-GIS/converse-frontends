import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Checkbox } from './component';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return <Checkbox value={checked} onValueChange={setChecked} />;
  },
};

export const Checked: Story = { args: { value: true } };
export const Unchecked: Story = { args: { value: false } };
export const Disabled: Story = { args: { value: false, disabled: true } };

export const Sizes: Story = {
  render: () => (
    <>
      <Checkbox value size="sm" />
      <Checkbox value size="md" />
      <Checkbox value size="lg" />
    </>
  ),
};
