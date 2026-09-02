import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { useResizeObserver } from '../../lib/use-resize-observer';
import { MultiSeriesSpendChart } from './component';
import type { MultiSeriesSpendSeries } from './types';

const meta: Meta<typeof MultiSeriesSpendChart> = {
  title: 'Charts/MultiSeriesSpendChart',
  component: MultiSeriesSpendChart,
  args: { width: 824, height: 220 },
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: 880 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MultiSeriesSpendChart>;

function days(count: number, base = '2026-02-01') {
  const start = new Date(base);
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}

/** Builds a series from sparse `[dayIndex, value]` pairs — a day with no pair is a real gap
 *  (the series reported nothing that day), never a `0` entry standing in for one. */
function sparseSeries(
  key: string,
  label: string,
  dayCount: number,
  active: [number, number][],
  breached = false
): MultiSeriesSpendSeries {
  const d = days(dayCount);
  return { key, label, breached, points: active.map(([i, y]) => ({ x: d[i], y })) };
}

function denseSeries(key: string, label: string, values: number[]): MultiSeriesSpendSeries {
  return sparseSeries(key, label, values.length, values.map((y, i): [number, number] => [i, y]));
}

// ─── The real fixture (build brief): one dominant model beside five sub-1%-share models ─────────
// Totals match the owner-supplied production figures exactly (deepseek's own 14 daily values are
// an approximate distribution that sums to its real $1.36 total; the ADR 0013 D5 measurement is
// about the SHAPE — one dominant series, several near-zero ones — not about any one day's split).
const DOMINANT_MODEL_SERIES: MultiSeriesSpendSeries[] = [
  denseSeries('deepseek-v4-flash-0731', 'deepseek-v4-flash-0731', [
    0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.1, 0.115, 0.12, 0.1, 0.095, 0.09, 0.085, 0.145,
  ]), // sums to 1.360
  sparseSeries('adorsys-researcher', 'adorsys-researcher', 14, [
    [2, 0.002],
    [7, 0.0015],
    [11, 0.002],
  ]), // sums to 0.0055
  sparseSeries('adorsys-coder', 'adorsys-coder', 14, [
    [4, 0.0001],
    [9, 0.00016],
  ]), // sums to 0.00026
  sparseSeries('qwen3-5-2b-local', 'qwen3-5-2b-local', 14, [[6, 0.00015]]),
  sparseSeries('qwen3-embedding-8b', 'qwen3-embedding-8b', 14, [[13, 0.000049]]),
  sparseSeries('minimax-m2p5', 'minimax-m2p5', 14, [[1, 0.000047]]),
];

const dayTick = (d: Date) => `${String(d.getDate()).padStart(2, '0')} Feb`;

/**
 * THE HARD PROBLEM, plotted honestly. `deepseek-v4-flash-0731` is ~100% of spend; every other
 * model flatlines at the baseline. This is the failure mode `log`/`indexed` exist to answer —
 * compare against `DominantModelLog` and `DominantModelIndexed` below.
 */
export const DominantModelLinear: Story = {
  name: 'Spend by model — dominant series, linear (the hard problem)',
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'linear' },
};

export const DominantModelLinearLight: Story = {
  name: 'Spend by model — dominant series, linear — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'linear' },
};

/** Every series stays visible; equal vertical spacing is equal RATIO, not equal dollars — the
 *  axis caption says so, and the axis ticks land on clean powers of ten. */
export const DominantModelLog: Story = {
  name: 'Spend by model — dominant series, log',
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'log' },
};

export const DominantModelLogLight: Story = {
  name: 'Spend by model — dominant series, log — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'log' },
};

/** Every series normalized to its OWN peak — a shape comparison. `deepseek` reads as a gentle
 *  ramp at 100%, same as the linear read; the five tiny models each get their own 0–100% story
 *  instead of a flat line at zero. */
export const DominantModelIndexed: Story = {
  name: 'Spend by model — dominant series, indexed',
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'indexed' },
};

export const DominantModelIndexedLight: Story = {
  name: 'Spend by model — dominant series, indexed — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'indexed' },
};

// ─── Balanced fixture — three comparable series, linear reads honestly here ──────────────────────
const BALANCED_SERIES: MultiSeriesSpendSeries[] = [
  denseSeries(
    'gpt-4o-mini',
    'gpt-4o-mini',
    [42, 45, 48, 44, 50, 53, 51, 55, 58, 54, 57, 60, 59, 62]
  ),
  denseSeries(
    'claude-sonnet',
    'claude-sonnet',
    [38, 36, 40, 41, 39, 43, 45, 42, 46, 48, 44, 47, 49, 46]
  ),
  denseSeries(
    'llama-3.1-70b',
    'llama-3.1-70b',
    [30, 32, 29, 33, 31, 34, 36, 33, 35, 37, 34, 36, 38, 35]
  ),
];

export const BalancedLinear: Story = {
  name: 'Spend by model — balanced series, linear',
  args: { series: BALANCED_SERIES, formatXTick: dayTick, scale: 'linear' },
};

// ─── Spend by project ──────────────────────────────────────────────────────────────────────────
const BY_PROJECT_SERIES: MultiSeriesSpendSeries[] = [
  denseSeries(
    'prod-api',
    'prod-api',
    [180, 195, 205, 190, 210, 225, 215, 230, 240, 220, 235, 248, 242, 255]
  ),
  denseSeries('internal-tools', 'internal-tools', [
    9, 10, 8, 11, 9, 10, 12, 9, 11, 10, 12, 11, 10, 13,
  ]),
  sparseSeries('research-sandbox', 'research-sandbox', 14, [
    [1, 2.4],
    [5, 1.1],
    [8, 3.2],
    [12, 0.8],
  ]),
  sparseSeries('staging', 'staging', 14, [
    [3, 0.4],
    [10, 0.6],
  ]),
];

export const SpendByProject: Story = {
  name: 'Spend by project',
  args: { series: BY_PROJECT_SERIES, formatXTick: dayTick, scale: 'linear' },
};

// ─── Spend by account (estate lens) ───────────────────────────────────────────────────────────
const BY_ACCOUNT_SERIES: MultiSeriesSpendSeries[] = [
  denseSeries(
    'acct_49534505',
    'acct_49534505',
    [310, 330, 345, 320, 355, 370, 360, 380, 395, 375, 390, 405, 398, 415]
  ),
  denseSeries('acme-labs', 'acme-labs', [
    22, 24, 21, 25, 23, 26, 28, 24, 27, 26, 29, 27, 25, 30,
  ]),
  denseSeries('northwind-ai', 'northwind-ai', [
    14, 15, 13, 16, 14, 17, 15, 18, 16, 15, 17, 16, 14, 18,
  ]),
  sparseSeries('acct_71a2c9e0', 'acct_71a2c9e0', 14, [
    [2, 3.1],
    [9, 2.4],
  ]),
];

export const SpendByAccount: Story = {
  name: 'Spend by account (estate)',
  args: { series: BY_ACCOUNT_SERIES, formatXTick: dayTick, scale: 'linear' },
};

// ─── Zero-spend tail collapse ─────────────────────────────────────────────────────────────────
const WITH_ZERO_SPEND_SERIES: MultiSeriesSpendSeries[] = [
  ...BALANCED_SERIES,
  { key: 'embed-3', label: 'embed-3', points: [] },
  { key: 'whisper-large', label: 'whisper-large', points: [] },
];

/** Two models had genuinely no spend this period — they collapse into the caption sentence
 *  ("2 more · no spend this period") instead of two flat lines at zero or two rows in a list. */
export const ZeroSpendTail: Story = {
  name: 'Zero-spend tail collapses into the caption',
  args: { series: WITH_ZERO_SPEND_SERIES, formatXTick: dayTick, scale: 'linear' },
};

// ─── Truncated fan-out ─────────────────────────────────────────────────────────────────────────
/** A caller whose own fan-out capped its scope (e.g. the estate lens' `MAX_FANNED_OUT_ACCOUNTS`)
 *  says so in the same caption sentence, never by presenting a partial result as complete. */
export const TruncatedFanOut: Story = {
  name: 'Truncated fan-out — caption states the cap',
  args: {
    series: BY_ACCOUNT_SERIES,
    formatXTick: dayTick,
    scale: 'linear',
    truncationCaption: 'Showing the top 25 of 61 accounts.',
  },
};

// ─── Hover-to-highlight / click-to-pin on the lines themselves ────────────────────────────────────
/**
 * No legend list (owner ruling, 2026-08-31: "why keeping the items as list below it and simply
 * not besides the mouse on hover using @floating-ui/react") — hover a day column to open the
 * Floating UI tooltip (rank-ordered, true dollar figure + period share per row); hover or click a
 * LINE directly to dim the others / pin the accent, exactly what the deleted legend's rows used
 * to do.
 */
export const HoverAndPinOnTheLines: Story = {
  name: 'Hover the tooltip, hover/click a line to pin',
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'log' },
};

// ─── Mobile ────────────────────────────────────────────────────────────────────────────────────
export const Mobile: Story = {
  name: 'Spend by model — dominant series, log — mobile',
  args: { series: DOMINANT_MODEL_SERIES, formatXTick: dayTick, scale: 'log', width: 343, height: 220 },
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 16, width: 375 }}>
        <Story />
      </div>
    ),
  ],
};

// ─── Fluid width ───────────────────────────────────────────────────────────────────────────────
/**
 * Demonstrates the fluid-width contract this component's own callers are expected to provide
 * (same pattern as `sections/spend-dashboard`'s `useResizeObserver` wrapper around
 * `SpendSeriesChart`): the chart measures its container and never causes page-level horizontal
 * scroll, whatever width the panel is resized to. Resize the Storybook canvas to see it adapt.
 */
export const FluidWidth: Story = {
  name: 'Fluid width (resize the canvas)',
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: '100%' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => {
    function FluidDemo() {
      const { ref, size } = useResizeObserver<HTMLDivElement>();
      return (
        <div ref={ref} className="w-full">
          {size.width > 0 ? (
            <MultiSeriesSpendChart
              {...args}
              series={DOMINANT_MODEL_SERIES}
              formatXTick={dayTick}
              scale="log"
              width={size.width}
              height={220}
            />
          ) : null}
        </div>
      );
    }
    return <FluidDemo />;
  },
};

/** No data in range — axes still render, a muted DOM caption sits on the baseline. */
export const Empty: Story = {
  args: { series: [] },
};

/**
 * A `compare: true` panel's overlay (`dashboards.yaml`): the current window solid, the previous
 * window DASHED and re-based forward so the two sit on the same x-domain. The dash is the only
 * thing distinguishing them — this console has no legend by ruling, and rank-2 grey is also what
 * an ordinary second model gets, so colour alone cannot say "this one is not now".
 */
export const DashedComparisonOverlay: Story = {
  args: {
    series: [
      denseSeries('current', 'This period', [612, 634, 651, 698, 685, 703, 728, 736, 754, 749]),
      {
        ...denseSeries('previous', 'Previous period', [
          548, 566, 581, 622, 611, 627, 649, 656, 672, 668,
        ]),
        dashed: true,
      },
    ],
  },
};
