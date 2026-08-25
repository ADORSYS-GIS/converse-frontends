// overview.svg's SPEND dashboard, moved here verbatim from the deleted `pages/overview/fixtures.ts`.
// These are deliberately the *same* datasets `SpendSeriesChart`'s own `component.stories.tsx`
// uses (captioned "Recreates overview.svg's dashboard 1"), so the page story matches the mockup
// with the data the chart primitive was already verified against, not a re-invented set.

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
    [92, 96, 88, 101, 118, 132, 128, 140, 155, 149, 162, 171, 168, 178, 184, 190, 186, 195, 201, 198, 205, 210, 208, 214, 218, 221, 219, 224, 226]
  ),
  makeSpendSeries(
    'claude-sonnet',
    'claude-sonnet',
    [58, 55, 60, 62, 64, 63, 66, 68, 70, 69, 72, 74, 73, 76, 78, 80, 79, 82, 84, 83, 86, 88, 87, 89, 91, 90, 92, 93, 94]
  ),
  makeSpendSeries(
    'llama-3.1-70b',
    'llama-3.1-70b',
    [30, 32, 31, 33, 35, 34, 36, 38, 37, 39, 41, 40, 42, 44, 43, 45, 47, 46, 48, 50, 49, 51, 53, 52, 54, 56, 55, 57, 59]
  ),
  makeSpendSeries(
    'embed-3',
    'embed-3',
    [12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26]
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

export function formatOverviewSpendYTick(value: number): string {
  return `$${value}`;
}

export function formatOverviewSpendTooltipValue(value: number): string {
  return `$${value.toFixed(2)}`;
}
