import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DateRangeField, presetRange } from './component';
import type { DateRangePreset, DateRangeValue } from './types';

const TODAY = new Date(Date.UTC(2026, 7, 29));

const PRESETS: DateRangePreset[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];

const meta: Meta<typeof DateRangeField> = {
  title: 'Components/DateRangeField',
  component: DateRangeField,
  parameters: { layout: 'padded' },
  args: {
    label: 'Range',
    presets: PRESETS,
    preset: '30d',
    value: presetRange(30, TODAY),
    today: TODAY,
    onPresetChange: () => {},
    onRangeChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DateRangeField>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Inline: Story = { args: { layout: 'inline' } };

/** A custom span: no preset is active, so the trigger reads the dates themselves. */
export const CustomRange: Story = {
  args: {
    preset: null,
    value: { from: new Date(Date.UTC(2026, 7, 12)), to: new Date(Date.UTC(2026, 7, 20)) },
  },
};

export const Interactive: Story = {
  render: function Render(args) {
    const [preset, setPreset] = useState<string | null>('30d');
    const [value, setValue] = useState<DateRangeValue>(presetRange(30, TODAY));
    return (
      <DateRangeField
        {...args}
        preset={preset}
        value={value}
        onPresetChange={(next) => {
          setPreset(next);
          setValue(presetRange(PRESETS.find((p) => p.value === next)!.days, TODAY));
        }}
        onRangeChange={(next) => {
          setPreset(null);
          setValue(next);
        }}
      />
    );
  },
};
