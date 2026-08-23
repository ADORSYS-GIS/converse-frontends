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

// Named function components, not inline arrows assigned to `render`, so `useState` below is
// recognized as a Hook call inside a component (`react-hooks/rules-of-hooks` requires the
// enclosing function name to start with an uppercase letter or `use`; a `render:` story property
// doesn't qualify even though Storybook treats it as one).
function ToggleSegmentedControl() {
  const [value, setValue] = useState('week');
  return <SegmentedControl options={TOGGLE_OPTIONS} value={value} onChange={setValue} />;
}

export const Toggle: Story = {
  render: () => <ToggleSegmentedControl />,
};

const ACTION_OPTIONS: SegmentedControlOption[] = [
  { key: 'revoke', label: 'Revoke', accessibilityLabel: 'Revoke key' },
  { key: 'rotate', label: 'Rotate', disabled: true, accessibilityLabel: 'Rotate key' },
];

export const ActionGroup: Story = {
  name: 'Action group (with disabled option)',
  render: () => <SegmentedControl options={ACTION_OPTIONS} value="" onChange={() => undefined} />,
};

function FullWidthSegmentedControl() {
  const [value, setValue] = useState('day');
  return (
    <SegmentedControl options={TOGGLE_OPTIONS} value={value} onChange={setValue} width="full" />
  );
}

export const FullWidth: Story = {
  render: () => <FullWidthSegmentedControl />,
};
