import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { HistogramChart } from './component';

const meta: Meta<typeof HistogramChart> = {
  title: 'Charts/HistogramChart',
  component: HistogramChart,
  args: { width: 528, height: 240 },
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: 580 }}>
        <Story />
      </div>
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

/** No samples at all -- axes render, a muted caption sits on the baseline (spec §6). */
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

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Breached` -- confirms the accent bars
// resolve to the light `--signal` (`#B4441C`), not the dark hex.
export const BreachedLight: Story = {
  name: 'Breached — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: {
    values: normalLatencySamples(400, 850, 120, 11),
    formatXTick: (v) => `${Math.round(v)}ms`,
    formatTooltipValue: (bin) => `${bin.count} requests`,
    breached: true,
  },
};

/**
 * Documents the geometry a loading skeleton for this chart must match --
 * `raised` bars over the exact plot area this chart itself computes, no
 * shimmer, no spinner (spec §6). See `SpendSeriesChart`'s equivalent story for
 * the full rationale on why this is story-only, not a component prop.
 */
export const LoadingSkeletonGeometryNote: Story = {
  name: 'Loading skeleton geometry (documentation only)',
  render: () => {
    const width = 528;
    const height = 240;
    const margin = { top: 12, right: 12, bottom: 28, left: 44 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const barCount = 10;
    const gap = 4;
    const barWidth = (plotWidth - gap * (barCount - 1)) / barCount;
    return (
      <svg width={width} height={height}>
        {Array.from({ length: barCount }, (_, i) => {
          const distanceFromCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const h = plotHeight * (0.9 - distanceFromCenter * 0.7);
          return (
            <rect
              key={i}
              x={margin.left + i * (barWidth + gap)}
              y={margin.top + plotHeight - h}
              width={barWidth}
              height={h}
              rx={2}
              fill="var(--color-raised)"
            />
          );
        })}
      </svg>
    );
  },
};
