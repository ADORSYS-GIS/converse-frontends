// overview.svg's SPEND dashboard, moved here verbatim from the deleted `pages/overview/fixtures.ts`.
// These are deliberately the *same* datasets `SpendSeriesChart`'s own `component.stories.tsx`
// uses (captioned "Recreates overview.svg's dashboard 1"), so the page story matches the mockup
// with the data the chart primitive was already verified against, not a re-invented set.

import { formatUsd, formatUsdAxis } from '../../lib/money';
import type { SpendSeriesSeries } from '../../components/spend-series-chart';

function febDays(count: number): Date[] {
  const base = new Date('2026-02-01');
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000));
}

function makeSpendSeries(
  key: string,
  label: string,
  values: number[],
  breached = false
): SpendSeriesSeries {
  const dates = febDays(values.length);
  return { key, label, breached, points: dates.map((x, i) => ({ x, y: values[i] })) };
}

export const overviewSpendSeries: SpendSeriesSeries[] = [
  makeSpendSeries(
    'gpt-4o-mini',
    'gpt-4o-mini',
    [
      92, 96, 88, 101, 118, 132, 128, 140, 155, 149, 162, 171, 168, 178, 184, 190, 186, 195, 201,
      198, 205, 210, 208, 214, 218, 221, 219, 224, 226,
    ]
  ),
  makeSpendSeries(
    'claude-sonnet',
    'claude-sonnet',
    [
      58, 55, 60, 62, 64, 63, 66, 68, 70, 69, 72, 74, 73, 76, 78, 80, 79, 82, 84, 83, 86, 88, 87,
      89, 91, 90, 92, 93, 94,
    ]
  ),
  makeSpendSeries(
    'llama-3.1-70b',
    'llama-3.1-70b',
    [
      30, 32, 31, 33, 35, 34, 36, 38, 37, 39, 41, 40, 42, 44, 43, 45, 47, 46, 48, 50, 49, 51, 53,
      52, 54, 56, 55, 57, 59,
    ]
  ),
  makeSpendSeries(
    'embed-3',
    'embed-3',
    [
      12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23,
      23, 24, 24, 25, 25, 26,
    ]
  ),
];

const SPEND_LEGEND_VALUES: Record<string, string> = {
  'gpt-4o-mini': '$61.20',
  'claude-sonnet': '$44.05',
  'llama-3.1-70b': '$25.60',
  'embed-3': '$11.70',
};

export function formatOverviewSpendLegendValue(series: SpendSeriesSeries): string {
  return SPEND_LEGEND_VALUES[series.key] ?? '';
}

export function formatOverviewSpendXTick(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')} Feb`;
}

/** Axis ticks go through `formatUsdAxis`, not a bare `$${value}` — see that function's docstring
 *  for why a tick label is a different job from a stated amount. */
export function formatOverviewSpendYTick(value: number): string {
  return formatUsdAxis(value);
}

/** A tooltip STATES an amount, so it takes the full ladder — a sub-cent point reads `$0.0063`
 *  here rather than the `$0.01` a `toFixed(2)` would have printed. */
export function formatOverviewSpendTooltipValue(value: number): string {
  return formatUsd(value);
}

/**
 * Real production magnitudes: an account whose whole month of spend is a fraction of a cent, split
 * across two models. Nothing here is a rounding artefact — the gateway meters per-token cost in
 * micro-USD, so a low-traffic account genuinely lands in this band.
 *
 * This is the dataset that shows what the y-axis formatter is FOR. `SpendSeriesChart`'s own
 * default tick formatter is `String(Math.round(v))`, which labels every tick on this domain `0`;
 * `formatUsdAxis` labels them `$0.0002` through `$0.001`. See `Sections/SpendDashboard`'s
 * `SubCentSpend` story.
 */
export const subCentSpendSeries: SpendSeriesSeries[] = [
  makeSpendSeries(
    'gpt-4o-mini',
    'gpt-4o-mini',
    [
      0.000_21, 0.000_34, 0.000_29, 0.000_41, 0.000_52, 0.000_48, 0.000_63, 0.000_71, 0.000_66,
      0.000_82, 0.000_79, 0.000_94, 0.001_02, 0.000_98,
    ]
  ),
  makeSpendSeries(
    'claude-sonnet',
    'claude-sonnet',
    [
      0.000_08, 0.000_11, 0.000_09, 0.000_14, 0.000_17, 0.000_16, 0.000_21, 0.000_24, 0.000_22,
      0.000_28, 0.000_27, 0.000_31, 0.000_35, 0.000_33,
    ]
  ),
];

/** The per-series totals for `subCentSpendSeries`, laddered — `$0.0088`, not `$0.01`. */
export function formatSubCentSpendLegendValue(series: SpendSeriesSeries): string {
  return formatUsd(series.points.reduce((sum, point) => sum + point.y, 0));
}
