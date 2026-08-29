import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LatencyRidgeline } from './component';

const meta: Meta<typeof LatencyRidgeline> = {
  title: 'Charts/LatencyRidgeline',
  component: LatencyRidgeline,
  args: { width: 528, height: 310 },
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: 580 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LatencyRidgeline>;

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

const gpt4oMini = normalSamples(400, 220, 40, 1);
const llama3 = normalSamples(400, 340, 55, 3);
const claudeSonnet = normalSamples(400, 900, 180, 2);
const embed3 = normalSamples(400, 60, 15, 4);

/** Recreates `overview.svg`'s dashboard 2 ("LATENCY — p95 PER BUCKET, BY MODEL"). */
export const ModelLatencyDistribution: Story = {
  name: 'Per-model latency distribution',
  args: {
    series: [
      { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: gpt4oMini, value: 'p95 312 ms' },
      { key: 'llama-3.1-70b', label: 'llama-3.1-70b', values: llama3, value: 'p95 468 ms' },
      {
        key: 'claude-sonnet',
        label: 'claude-sonnet',
        values: claudeSonnet,
        value: 'p95 1 240 ms · over SLO',
        breached: true,
      },
      { key: 'embed-3', label: 'embed-3', values: embed3, value: 'p95 88 ms' },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
    formatTooltipValue: (bin: { count: number }) => `${bin.count} requests`,
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `ModelLatencyDistribution` -- the
// ridgeline fill is `--panel` (white) against a `--floor` (grey) rather than `--panel` (near-
// black) against `--floor` (black); the inversion still holds (panel is always lighter than the
// floor it sits on), so the ridges read the same way in both themes.
export const ModelLatencyDistributionLight: Story = {
  name: 'Per-model latency distribution — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: {
    series: [
      { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: gpt4oMini, value: 'p95 312 ms' },
      { key: 'llama-3.1-70b', label: 'llama-3.1-70b', values: llama3, value: 'p95 468 ms' },
      {
        key: 'claude-sonnet',
        label: 'claude-sonnet',
        values: claudeSonnet,
        value: 'p95 1 240 ms · over SLO',
        breached: true,
      },
      { key: 'embed-3', label: 'embed-3', values: embed3, value: 'p95 88 ms' },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
    formatTooltipValue: (bin: { count: number }) => `${bin.count} requests`,
  },
};

/** No data at all -- the axis frame renders with a muted caption on the baseline (spec §6). */
export const Empty: Story = {
  args: { series: [] },
};

/** One row has zero samples entirely -- computeSharedBins zero-fills it against the shared edges; it must still lay out as a flat line, not be omitted. */
export const SeriesWithZeroValues: Story = {
  args: {
    series: [
      { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: gpt4oMini },
      { key: 'unused-model', label: 'unused-model', values: [] },
      { key: 'claude-sonnet', label: 'claude-sonnet', values: claudeSonnet },
    ],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
  },
};

/** One ridge, no overlap to reason about -- also the realistic "only one model has traffic yet" case. */
export const SingleSeries: Story = {
  args: {
    series: [{ key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: gpt4oMini, value: 'p95 312 ms' }],
    formatXTick: (v: number) => `${Math.round(v)}ms`,
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

/**
 * Documents the geometry a loading skeleton for this chart must match --
 * `raised` blocks in place of the ridges, no shimmer, no spinner (spec §6).
 * See `SpendSeriesChart`'s equivalent story for the full rationale.
 */
export const LoadingSkeletonGeometryNote: Story = {
  name: 'Loading skeleton geometry (documentation only)',
  render: () => {
    const width = 528;
    const height = 310;
    const margin = { top: 16, right: 12, bottom: 28, left: 108 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const rowCount = 4;
    const rowHeight = plotHeight / rowCount;
    return (
      <svg width={width} height={height}>
        {Array.from({ length: rowCount }, (_, i) => (
          <rect
            key={i}
            x={margin.left}
            y={margin.top + i * rowHeight + 6}
            width={plotWidth}
            height={rowHeight - 12}
            rx={2}
            fill="var(--color-raised)"
          />
        ))}
      </svg>
    );
  },
};
