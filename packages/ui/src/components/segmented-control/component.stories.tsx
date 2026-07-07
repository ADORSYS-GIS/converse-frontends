import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { SegmentedControl } from './component';
import type { SegmentedControlOption } from './types';

const meta: Meta<typeof SegmentedControl> = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

const TOGGLE_OPTIONS: SegmentedControlOption[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export const Toggle: Story = {
  render: () => {
    const [value, setValue] = useState('week');
    return <SegmentedControl options={TOGGLE_OPTIONS} value={value} onChange={setValue} />;
  },
};

const ACTION_OPTIONS: SegmentedControlOption[] = [
  { key: 'revoke', label: 'Revoke', accessibilityLabel: 'Revoke key' },
  { key: 'rotate', label: 'Rotate', disabled: true, accessibilityLabel: 'Rotate key' },
];

export const ActionGroup: Story = {
  name: 'Action group (with disabled option)',
  render: () => <SegmentedControl options={ACTION_OPTIONS} value="" onChange={() => undefined} />,
};

export const FullWidth: Story = {
  render: () => {
    const [value, setValue] = useState('day');
    return (
      <SegmentedControl options={TOGGLE_OPTIONS} value={value} onChange={setValue} width="full" />
    );
  },
};
