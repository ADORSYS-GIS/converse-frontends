import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SpendSeriesChart } from './component';
import type { SpendSeriesSeries } from './types';

const meta: Meta<typeof SpendSeriesChart> = {
  title: 'Charts/SpendSeriesChart',
  component: SpendSeriesChart,
  args: { width: 824, height: 176 },
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: 880 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SpendSeriesChart>;

function febDays(count: number) {
  const base = new Date('2026-02-01');
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000));
}

function makeSeries(
  key: string,
  label: string,
  values: number[],
  breached = false
): SpendSeriesSeries {
  const dates = febDays(values.length);
  return { key, label, breached, points: dates.map((x, i) => ({ x, y: values[i] })) };
}

const gpt4oMini = makeSeries(
  'gpt-4o-mini',
  'gpt-4o-mini',
  [
    92, 96, 88, 101, 118, 132, 128, 140, 155, 149, 162, 171, 168, 178, 184, 190, 186, 195, 201, 198,
    205, 210, 208, 214, 218, 221, 219, 224, 226,
  ]
);
const claudeSonnet = makeSeries(
  'claude-sonnet',
  'claude-sonnet',
  [
    58, 55, 60, 62, 64, 63, 66, 68, 70, 69, 72, 74, 73, 76, 78, 80, 79, 82, 84, 83, 86, 88, 87, 89,
    91, 90, 92, 93, 94,
  ]
);
const llama3 = makeSeries(
  'llama-3.1-70b',
  'llama-3.1-70b',
  [
    30, 32, 31, 33, 35, 34, 36, 38, 37, 39, 41, 40, 42, 44, 43, 45, 47, 46, 48, 50, 49, 51, 53, 52,
    54, 56, 55, 57, 59,
  ]
);
const embed3 = makeSeries(
  'embed-3',
  'embed-3',
  [
    12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23,
    24, 24, 25, 25, 26,
  ]
);

const legendValues: Record<string, string> = {
  'gpt-4o-mini': '$61.20',
  'claude-sonnet': '$44.05',
  'llama-3.1-70b': '$25.60',
  'embed-3': '$11.70',
};

/**
 * Recreates `overview.svg`'s dashboard 1 ("Spend — by project and model").
 * Fully interactive: select a legend entry in the canvas below to see it turn
 * `--signal` -- the chart holds its own selection state, same as the source.
 */
export const SpendByProjectAndModel: Story = {
  args: {
    series: [gpt4oMini, claudeSonnet, llama3, embed3],
    formatXTick: (d) => `${String(d.getDate()).padStart(2, '0')} Feb`,
    formatYTick: (v) => `$${v}`,
    formatTooltipValue: (v) => `$${v.toFixed(2)}`,
    formatLegendValue: (s) => legendValues[s.key] ?? '',
  },
};

/** A project has breached its budget ceiling -- renders in the accent regardless of selection. */
export const WithBreachedProject: Story = {
  args: {
    series: [gpt4oMini, claudeSonnet, { ...llama3, breached: true }, embed3],
    formatXTick: (d) => `${String(d.getDate()).padStart(2, '0')} Feb`,
    formatYTick: (v) => `$${v}`,
    formatLegendValue: (s) => legendValues[s.key] ?? '',
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `WithBreachedProject` -- this is the
// story that first caught the phase-4 hardcoded-`#000` decorator bug (fixed by switching this
// file's own decorator to `bg-muted`).
export const WithBreachedProjectLight: Story = {
  name: 'With Breached Project — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: {
    series: [gpt4oMini, claudeSonnet, { ...llama3, breached: true }, embed3],
    formatXTick: (d) => `${String(d.getDate()).padStart(2, '0')} Feb`,
    formatYTick: (v) => `$${v}`,
    formatLegendValue: (s) => legendValues[s.key] ?? '',
  },
};

export const BarsVariant: Story = {
  args: {
    series: [gpt4oMini, claudeSonnet],
    variant: 'bars',
    formatXTick: (d) => `${String(d.getDate()).padStart(2, '0')} Feb`,
    formatYTick: (v) => `$${v}`,
  },
};

/** No data in range -- axes render, a muted caption sits on the baseline (spec §6). */
export const Empty: Story = {
  args: { series: [] },
};

/** One data point per series -- must render a marker, not an invisible zero-length line. */
export const SingleDataPoint: Story = {
  args: { series: [makeSeries('project-a', 'project-a', [180])] },
};

/** Every value is 0 -- the domain must widen so the flat line still renders above the floor. */
export const AllZero: Story = {
  args: { series: [makeSeries('project-a', 'project-a', [0, 0, 0, 0, 0])] },
};

/** One series two orders of magnitude larger than another -- both must still fit the domain. */
export const OneSeriesDwarfsAnother: Story = {
  args: {
    series: [
      makeSeries('tiny-project', 'tiny-project', [5, 8, 6, 9, 7]),
      makeSeries('huge-project', 'huge-project', [4000, 4200, 3900, 4500, 4800]),
    ],
  },
};

/**
 * Build brief §2a — the gap-breaking fix. This project genuinely spent nothing on several days
 * (a real, sparse-usage account, not an artifact) — the line must show a visible break over each
 * absent day rather than a straight segment implying spend that never happened.
 */
export const SparseGap: Story = {
  args: {
    series: [
      (() => {
        const days = febDays(17);
        // Active on days 0, 3, 5, 10, 13, 16 — 6 of 17 days, matching the phase's own
        // "median 5 active days / 17" measurement.
        const active: [number, number][] = [
          [0, 4.2],
          [3, 6.1],
          [5, 0.4],
          [10, 9.8],
          [13, 2.0],
          [16, 3.3],
        ];
        return {
          key: 'sparse-project',
          label: 'sparse-project',
          points: active.map(([dayIndex, y]) => ({ x: days[dayIndex], y })),
        };
      })(),
    ],
    formatXTick: (d) => `${String(d.getDate()).padStart(2, '0')} Feb`,
    formatYTick: (v) => `$${v}`,
  },
};

/**
 * The account-lens budget burn-down (build brief §2b/§3): `cumulative` turns the same raw
 * per-bucket series into a running total, forward-filled across days with no spend, and `ceiling`
 * draws the dashed reference rule. This account crosses its ceiling partway through the month, so
 * the line turns the SAME breach accent `series[].breached` already drives elsewhere.
 */
export const CumulativeBudgetBurnDown: Story = {
  args: {
    series: [
      {
        key: 'account',
        label: 'This account',
        points: [1.2, 0, 2.4, 0, 0, 3.1, 1.8, 0, 4.0, 2.2].map((y, i) => ({
          x: febDays(10)[i],
          y,
        })),
      },
    ],
    cumulative: true,
    ceiling: 12,
    formatXTick: (d) => `${String(d.getDate()).padStart(2, '0')} Feb`,
    formatYTick: (v) => `$${v}`,
    formatTooltipValue: (v) => `$${v.toFixed(2)}`,
  },
};

/**
 * Documents the geometry a loading skeleton for this chart must match --
 * `raised` blocks over the exact plot area this chart itself computes, no
 * shimmer, no spinner (spec §6). `SkeletonRow`/`SkeletonMetric` (table/stat-
 * card skeletons) are separate components outside this batch's scope; a
 * chart-loading skeleton is not a prop on `SpendSeriesChart` itself -- a page
 * composes this frame in place of the chart while its data query is in
 * flight, then swaps to the real chart once it resolves.
 */
export const LoadingSkeletonGeometryNote: Story = {
  name: 'Loading skeleton geometry (documentation only)',
  render: () => {
    const width = 824;
    const height = 176;
    const margin = { top: 12, right: 12, bottom: 28, left: 52 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const barCount = 8;
    const gap = 14;
    const barWidth = (plotWidth - gap * (barCount - 1)) / barCount;
    return (
      <svg width={width} height={height}>
        {Array.from({ length: barCount }, (_, i) => {
          const h = plotHeight * (0.35 + 0.5 * ((i % 3) / 2));
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
