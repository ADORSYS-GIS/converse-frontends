import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { RidgelineChart } from './component';

const meta: Meta<typeof RidgelineChart> = {
  title: 'UI/RidgelineChart',
  component: RidgelineChart,
  args: { width: 620, height: 320 },
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: '#000', padding: 24, width: 680 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RidgelineChart>;

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function normalSamples(count: number, mean: number, spread: number, seed: number): number[] {
  const rand = seededRandom(seed);
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const u1 = Math.max(rand(), 1e-6);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    values.push(Math.max(mean + z * spread, 0));
  }
  return values;
}

const gpt4o = normalSamples(400, 220, 40, 1);
const claude = normalSamples(400, 340, 60, 2);
const llama = normalSamples(400, 180, 25, 3);
const mistral = normalSamples(400, 480, 90, 4);

export const ModelLatencyDistribution: Story = {
  name: 'Per-model latency distribution',
  args: {
    series: [
      { key: 'gpt-4o', label: 'gpt-4o', values: gpt4o },
      { key: 'claude-sonnet', label: 'claude-sonnet', values: claude },
      { key: 'llama-3', label: 'llama-3', values: llama },
      { key: 'mistral-large', label: 'mistral-large', values: mistral },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
    formatTooltipValue: (bin: { count: number }) => `${bin.count} requests`,
  },
};

/** No data at all -- renders the axis frame, not a crash or a blank white hole. */
export const Empty: Story = {
  args: { series: [] },
};

/** One row has zero samples entirely -- computeSharedBins zero-fills it against the shared edges; it must still lay out as a flat line, not be omitted. */
export const SeriesWithZeroValues: Story = {
  args: {
    series: [
      { key: 'gpt-4o', label: 'gpt-4o', values: gpt4o },
      { key: 'unused-model', label: 'unused-model', values: [] },
      { key: 'claude-sonnet', label: 'claude-sonnet', values: claude },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
  },
};

/** One ridge, no overlap to reason about -- also the realistic "only one model has traffic yet" case. */
export const SingleSeries: Story = {
  args: {
    series: [{ key: 'gpt-4o', label: 'gpt-4o', values: gpt4o }],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
  },
};

/** Every sample in a row is the exact same value -- computeSharedBins collapses this to a single shared bin; must not divide by a zero-width bin or produce a NaN path. */
export const SingleValueSpike: Story = {
  args: {
    series: [
      { key: 'gpt-4o', label: 'gpt-4o', values: gpt4o },
      { key: 'cached-model', label: 'cached-model', values: Array.from({ length: 300 }, () => 50) },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
  },
};

/** Every row is the exact same value (fully-degenerate, including all-zero) -- the whole chart collapses to one shared bin. */
export const AllIdenticalAllZero: Story = {
  args: {
    series: [
      { key: 'a', label: 'model-a', values: [0, 0, 0, 0, 0] },
      { key: 'b', label: 'model-b', values: [0, 0, 0] },
    ],
  },
};

/** One model has 10,000 samples, another has 5 -- per-row normalization must keep the low-count ridge's shape visible, not flattened to a hairline by a shared count scale. */
export const OneSeriesDwarfsAnother: Story = {
  args: {
    series: [
      {
        key: 'high-traffic',
        label: 'high-traffic-model',
        values: normalSamples(10_000, 200, 30, 7),
      },
      { key: 'low-traffic', label: 'low-traffic-model', values: [180, 195, 205, 210, 190] },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
  },
};

export const WithBreachedRow: Story = {
  args: {
    series: [
      { key: 'gpt-4o', label: 'gpt-4o', values: gpt4o },
      { key: 'claude-sonnet', label: 'claude-sonnet', values: claude },
      { key: 'slow-model', label: 'slow-model', values: mistral, breached: true },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
  },
};
