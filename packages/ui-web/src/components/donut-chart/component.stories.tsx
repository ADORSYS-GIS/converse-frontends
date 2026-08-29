import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { formatUsd } from '../../lib/money';
import { DonutChart } from './component';
import type { DonutSlice } from './types';

const meta: Meta<typeof DonutChart> = {
  title: 'Charts/DonutChart',
  component: DonutChart,
  args: { width: 200, height: 200 },
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: 260 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DonutChart>;

const SPEND_SHARE_SLICES: DonutSlice[] = [
  { key: 'gateway-prod', label: 'gateway-prod', value: 61.2 },
  { key: 'gateway-staging', label: 'gateway-staging', value: 44.05 },
  { key: 'batch-eval', label: 'batch-eval', value: 25.6 },
  { key: 'internal-tools', label: 'internal-tools', value: 11.7 },
];

const total = SPEND_SHARE_SLICES.reduce((sum, s) => sum + s.value, 0);

function percentLabel(slice: DonutSlice, percent: number): string {
  return `${formatUsd(slice.value)} · ${percent.toFixed(0)}%`;
}

/**
 * Recreates the SPEND — SHARE BY PROJECT section's donut: four projects, mono centre total,
 * legend echoing `overview.svg`'s spend dashboard values. Fully interactive: click a wedge or a
 * legend entry to see it turn `--signal` -- the chart holds its own selection state, same as
 * `SpendSeriesChart`.
 */
export const Populated: Story = {
  args: {
    slices: SPEND_SHARE_SLICES,
    centreMetric: formatUsd(total),
    centreLabel: 'TOTAL',
    formatTooltipValue: percentLabel,
    formatLegendValue: percentLabel,
  },
};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Populated.args,
};

/** A slice pre-selected via the controlled `selectedKey` prop, as a host page would drive it. */
export const Selected: Story = {
  args: {
    ...Populated.args,
    selectedKey: 'gateway-staging',
  },
};

/**
 * `gateway-prod` has breached its budget ceiling -- renders in the accent regardless of
 * selection. Two slices carry `breached: true` here on purpose, to show the single-orange
 * invariant holds even when the input data doesn't: only the first breached slice in series
 * order gets the accent.
 */
export const Breached: Story = {
  args: {
    slices: [
      { ...SPEND_SHARE_SLICES[0], breached: true },
      SPEND_SHARE_SLICES[1],
      { ...SPEND_SHARE_SLICES[2], breached: true },
      SPEND_SHARE_SLICES[3],
    ],
    centreMetric: formatUsd(total),
    centreLabel: 'TOTAL',
    formatTooltipValue: percentLabel,
    formatLegendValue: percentLabel,
  },
};

export const BreachedLight: Story = {
  name: 'Breached — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Breached.args,
};

/** No data in range -- the ring geometry still renders (never a blank pane), muted caption inside. */
export const Empty: Story = {
  args: { slices: [] },
};

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { slices: [] },
};

/** A single slice -- the ring is one solid wedge, still the rank-0 grey. */
export const SingleSlice: Story = {
  args: {
    slices: [{ key: 'only-project', label: 'only-project', value: 42 }],
    centreMetric: formatUsd(42),
    centreLabel: 'TOTAL',
  },
};

/** Interactive harness with local state, demonstrating controlled `selectedKey` sync -- the same
 * shape a host page uses to keep this donut, its legend, and a sibling chart's rail legend on one
 * `selectedKey`. */
export const ControlledSelection: Story = {
  render: (args) => {
    function Harness() {
      const [selectedKey, setSelectedKey] = useState<string | null>(null);
      return (
        <DonutChart
          {...args}
          slices={SPEND_SHARE_SLICES}
          selectedKey={selectedKey}
          onSelectSlice={setSelectedKey}
        />
      );
    }
    return <Harness />;
  },
  args: {
    centreMetric: formatUsd(total),
    centreLabel: 'TOTAL',
    formatTooltipValue: percentLabel,
    formatLegendValue: percentLabel,
  },
};
