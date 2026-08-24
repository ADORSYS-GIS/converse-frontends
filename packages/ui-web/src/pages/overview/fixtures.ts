// Realistic mock data for `OverviewPage` stories/tests -- console-ui skill "Page views" section.
// The spend/latency numbers are deliberately the *same* datasets already used by
// `SpendSeriesChart`'s and `LatencyRidgeline`'s own `component.stories.tsx` (both captioned
// "Recreates overview.svg's dashboard N"), so this page's acceptance story matches the mockup
// with the same data the chart primitives were already verified against, not a re-invented set.

import type { LatencyRidgelineSeries } from '../../components/latency-ridgeline';
import type { SpendSeriesSeries } from '../../components/spend-series-chart';
import type {
  OverviewNeedsAttentionProject,
  OverviewRefillRequestStatus,
  OverviewSelectOption,
  OverviewStatCardData,
} from './types';

function febDays(count: number): Date[] {
  const base = new Date('2026-02-01');
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000));
}

function makeSpendSeries(
  key: string,
  label: string,
  values: number[],
  breached = false,
): SpendSeriesSeries {
  const dates = febDays(values.length);
  return { key, label, breached, points: dates.map((x, i) => ({ x, y: values[i] })) };
}

export const overviewSpendSeries: SpendSeriesSeries[] = [
  makeSpendSeries(
    'gpt-4o-mini',
    'gpt-4o-mini',
    [92, 96, 88, 101, 118, 132, 128, 140, 155, 149, 162, 171, 168, 178, 184, 190, 186, 195, 201, 198, 205, 210, 208, 214, 218, 221, 219, 224, 226],
  ),
  makeSpendSeries(
    'claude-sonnet',
    'claude-sonnet',
    [58, 55, 60, 62, 64, 63, 66, 68, 70, 69, 72, 74, 73, 76, 78, 80, 79, 82, 84, 83, 86, 88, 87, 89, 91, 90, 92, 93, 94],
  ),
  makeSpendSeries(
    'llama-3.1-70b',
    'llama-3.1-70b',
    [30, 32, 31, 33, 35, 34, 36, 38, 37, 39, 41, 40, 42, 44, 43, 45, 47, 46, 48, 50, 49, 51, 53, 52, 54, 56, 55, 57, 59],
  ),
  makeSpendSeries(
    'embed-3',
    'embed-3',
    [12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26],
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

export const overviewLatencySeries: LatencyRidgelineSeries[] = [
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: normalSamples(400, 220, 40, 1), value: 'p95 312 ms' },
  { key: 'llama-3.1-70b', label: 'llama-3.1-70b', values: normalSamples(400, 340, 55, 3), value: 'p95 468 ms' },
  {
    key: 'claude-sonnet',
    label: 'claude-sonnet',
    values: normalSamples(400, 900, 180, 2),
    value: 'p95 1 240 ms · over SLO',
    breached: true,
  },
  { key: 'embed-3', label: 'embed-3', values: normalSamples(400, 60, 15, 4), value: 'p95 88 ms' },
];

export function formatOverviewLatencyXTick(value: number): string {
  return `${Math.round(value)}ms`;
}

export const overviewStatCards: OverviewStatCardData[] = [
  {
    key: 'spend-this-month',
    icon: 'spend',
    label: 'SPEND THIS MONTH',
    metric: '$142.55',
    delta: { direction: 'up', label: '18% vs prev 30d' },
    sparklineData: [96, 92, 98, 88, 91, 84, 87, 79, 74],
  },
  {
    key: 'active-projects',
    icon: 'projects',
    label: 'ACTIVE PROJECTS',
    metric: '6',
    delta: { direction: 'flat', label: 'no change' },
    sparklineData: [6, 6, 5, 5, 5, 6, 6, 6, 6],
  },
  {
    key: 'active-api-keys',
    icon: 'keys',
    label: 'ACTIVE API KEYS',
    metric: '23',
    delta: { direction: 'up', label: '2 this week' },
    sparklineData: [17, 18, 18, 19, 19, 20, 21, 22, 23],
  },
  {
    key: 'requests-today',
    icon: 'requests',
    label: 'REQUESTS TODAY',
    metric: '41,208',
    delta: { direction: 'down', label: '8% vs yesterday' },
    sparklineData: [38400, 37900, 38600, 37200, 37700, 36600, 36900, 36200, 36600],
  },
];

export const overviewEmptyStatCards: OverviewStatCardData[] = [
  { key: 'spend-this-month', icon: 'spend', label: 'SPEND THIS MONTH', metric: '$0.00', sparklineData: [0, 0] },
  { key: 'active-projects', icon: 'projects', label: 'ACTIVE PROJECTS', metric: '1', sparklineData: [1, 1] },
  { key: 'active-api-keys', icon: 'keys', label: 'ACTIVE API KEYS', metric: '0', sparklineData: [0, 0] },
  { key: 'requests-today', icon: 'requests', label: 'REQUESTS TODAY', metric: '0', sparklineData: [0, 0] },
];

export const overviewBudget = {
  value: 142.55,
  ceiling: 500,
  caption: 'account ceiling · 28% used · resets 01 Mar',
};

export const overviewNeedsAttentionProject: OverviewNeedsAttentionProject = {
  name: 'gateway-prod',
  value: 455.2,
  ceiling: 500,
  caption: '91% of ceiling · 6 days left',
  refillActionLabel: 'Request refill',
};

export const overviewRefillRequestStatus: OverviewRefillRequestStatus = {
  pendingCount: 1,
  submittedLabel: 'submitted 2 days ago',
};

export const RANGE_OPTIONS: OverviewSelectOption[] = [
  { value: 'last-7', label: 'Last 7 days' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'last-90', label: 'Last 90 days' },
];

export const BUCKET_OPTIONS: OverviewSelectOption[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const GROUP_BY_OPTIONS: OverviewSelectOption[] = [
  { value: 'project', label: 'Project' },
  { value: 'project-model', label: 'Project × Model' },
  { value: 'model', label: 'Model' },
];

export const ACCOUNT_FILTER_OPTIONS: OverviewSelectOption[] = [{ value: 'adorsys-gis', label: 'adorsys-gis' }];

export const PROJECT_FILTER_OPTIONS: OverviewSelectOption[] = [
  { value: 'all', label: 'All projects' },
  { value: 'gateway-prod', label: 'gateway-prod' },
  { value: 'gateway-staging', label: 'gateway-staging' },
];

export const MODEL_FILTER_OPTIONS: OverviewSelectOption[] = [
  { value: 'all', label: 'All models' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'claude-sonnet', label: 'claude-sonnet' },
  { value: 'llama-3.1-70b', label: 'llama-3.1-70b' },
  { value: 'embed-3', label: 'embed-3' },
];
