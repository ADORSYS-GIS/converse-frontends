import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ChartLegend } from './component';

const meta: Meta<typeof ChartLegend> = {
  title: 'UI/ChartLegend',
  component: ChartLegend,
  decorators: [
    (Story) => (
      <div style={{ background: '#000', padding: 24, width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChartLegend>;

const MODELS = [
  { key: 'gpt-a', label: 'gpt-a' },
  { key: 'gpt-b', label: 'gpt-b' },
  { key: 'gpt-c', label: 'gpt-c' },
  { key: 'gpt-d', label: 'gpt-d' },
];

export const Default: Story = {
  args: { items: MODELS },
};

/** A single series renders no legend box at all -- the chart's title already names it. */
export const SingleSeriesRendersNothing: Story = {
  args: { items: [MODELS[0]] },
};

export const OneSeriesBreached: Story = {
  args: {
    items: [MODELS[0], { ...MODELS[1], breached: true }, MODELS[2]],
  },
};

/** Tap a legend item to select it -- the selected series (and only it) turns to the accent. */
export const InteractiveSelection: Story = {
  render: () => {
    function Demo() {
      const [selectedKey, setSelectedKey] = useState<string | null>(null);
      return <ChartLegend items={MODELS} selectedKey={selectedKey} onSelectKey={setSelectedKey} />;
    }
    return <Demo />;
  },
};

/** Six series still resolve to distinct grey/dash combinations by cycling the ramp, never a re-sort. */
export const ManySeries: Story = {
  args: {
    items: [
      ...MODELS,
      { key: 'gpt-e', label: 'gpt-e' },
      { key: 'gpt-f', label: 'gpt-f' },
      { key: 'gpt-g', label: 'gpt-g (cycles back to slot 1)' },
    ],
  },
};
