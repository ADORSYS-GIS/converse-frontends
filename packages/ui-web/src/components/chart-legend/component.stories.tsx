import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChartLegend } from './component';

const meta: Meta<typeof ChartLegend> = {
  title: 'Charts/ChartLegend',
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
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: '$61.20' },
  { key: 'claude-sonnet', label: 'claude-sonnet', value: '$44.05' },
  { key: 'llama-3.1-70b', label: 'llama-3.1-70b', value: '$25.60' },
  { key: 'embed-3', label: 'embed-3', value: '$11.70' },
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

export const WithoutValues: Story = {
  args: { items: MODELS.map(({ key, label }) => ({ key, label })) },
};

/** Select a legend item to highlight it -- the selected series (and only it) turns to the accent. */
export const InteractiveSelection: Story = {
  render: () => {
    function Demo() {
      const [selectedKey, setSelectedKey] = useState<string | null>('gpt-4o-mini');
      return <ChartLegend items={MODELS} selectedKey={selectedKey} onSelectKey={setSelectedKey} />;
    }
    return <Demo />;
  },
};

/** Six series still resolve to distinct ramp colours by cycling, never a re-sort. */
export const ManySeries: Story = {
  args: {
    items: [
      ...MODELS,
      { key: 'gpt-e', label: 'gpt-e', value: '$8.10' },
      { key: 'gpt-f', label: 'gpt-f', value: '$3.40' },
      { key: 'gpt-g', label: 'gpt-g (cycles back to slot 1)', value: '$0.90' },
    ],
  },
};
