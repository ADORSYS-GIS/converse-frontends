import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { HistogramChart } from './component';

const meta: Meta<typeof HistogramChart> = {
  title: 'UI/HistogramChart',
  component: HistogramChart,
  args: { width: 560, height: 280 },
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: '#000', padding: 24, width: 620 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HistogramChart>;

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function normalLatencySamples(count: number, mean: number, spread: number, seed = 7) {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const u1 = rand() || 1e-6;
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(mean + z * spread, 0);
  });
}

/** A typical per-model latency distribution -- roughly bell-shaped around a mean, in ms. */
export const LatencyDistribution: Story = {
  args: {
    values: normalLatencySamples(400, 220, 60),
    formatXTick: (v) => `${Math.round(v)}ms`,
    formatYTick: (v) => String(Math.round(v)),
    formatTooltipValue: (bin) => `${bin.count} requests`,
  },
};

/** No samples at all -- renders the axis frame, not a crash or a blank white hole. */
export const Empty: Story = {
  args: { values: [] },
};

/** A single sample -- must render one visible bar, not a divide-by-zero-width sliver. */
export const SingleDataPoint: Story = {
  args: { values: [180], formatXTick: (v) => `${Math.round(v)}ms` },
};

/** Every sample is the same value (0) -- the domain must widen so the collapsed bucket still renders one visible bar spanning it. */
export const AllZero: Story = {
  args: { values: Array.from({ length: 20 }, () => 0) },
};

/** Nearly every sample lands in one bucket, with a thin scatter of outliers -- the y-scale must fit the tallest bar without every other bar becoming an invisible 1px line. */
export const OneBucketDwarfsTheRest: Story = {
  args: {
    values: [...Array.from({ length: 300 }, () => 50 + Math.random() * 4), 120, 340, 560, 780, 910],
    formatXTick: (v) => `${Math.round(v)}ms`,
  },
};

/** This series has breached a configured latency SLO ceiling -- renders in the accent, per ADR-0008 Decision 6. */
export const Breached: Story = {
  args: {
    values: normalLatencySamples(400, 850, 120, 11),
    formatXTick: (v) => `${Math.round(v)}ms`,
    formatTooltipValue: (bin) => `${bin.count} requests`,
    breached: true,
  },
};
