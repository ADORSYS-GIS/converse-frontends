import { formatUsd } from '../../lib/money';
import type { DashboardPanelType, DashboardPanelView } from './types';

/**
 * One fixture per panel type — the data the `Panels/*` stories and the `Pages/FromSpec` story
 * render against, and the "mocked query layer" the epic's Storybook AC asks for.
 *
 * Deliberately shaped like real prod usage rather than like a tidy demo: the phase-4 measurement
 * over 726k rows found top-1 dominance (one model at ~95% of an account's traffic) to be the
 * COMMON case, so the ranked/share/donut fixtures below are dominated by one key. That is what
 * makes the stories a real review surface — a fixture with four evenly-sized bands would make
 * every one of these charts look fine.
 */

const DAY = 86_400_000;
const START = Date.UTC(2026, 7, 3);

function days(count: number, shape: (index: number) => number) {
  return Array.from({ length: count }, (_, index) => ({
    x: new Date(START + index * DAY),
    y: shape(index),
  }));
}

const MODEL_TOTALS: [string, number][] = [
  ['gpt-4o', 812.4],
  ['claude-sonnet-4', 96.15],
  ['gpt-4o-mini', 21.8],
  ['mistral-large', 9.05],
  ['text-embedding-3', 2.4],
  ['llama-3.1-70b', 1.1],
  ['gemini-1.5-pro', 0.62],
  ['deepseek-v3', 0.08],
];

export const panelFixtures: Record<DashboardPanelType, DashboardPanelView> = {
  stat: {
    kind: 'stat',
    label: 'Total cost',
    metric: '$943.60',
    delta: { direction: 'up', label: '12% vs previous month' },
  },

  'stat-group': {
    kind: 'stat-group',
    stats: [
      { key: 'free', label: 'Accounts on Free', metric: '128' },
      {
        key: 'pro',
        label: 'Accounts on Pro',
        metric: '41',
        delta: { direction: 'up', label: '3 new' },
      },
      { key: 'scale', label: 'Accounts on Scale', metric: '6' },
      {
        key: 'trial',
        label: 'Accounts on Trial',
        metric: '19',
        delta: { direction: 'down', label: '2 lapsed' },
      },
    ],
  },

  series: {
    kind: 'series',
    series: MODEL_TOTALS.slice(0, 4).map(([key, total], rank) => ({
      key,
      label: key,
      points: days(21, (index) => (total / 21) * (0.7 + 0.4 * Math.sin(index / 2 + rank))),
    })),
    scale: 'linear',
    onScaleChange: () => {},
  },

  ranked: {
    kind: 'ranked',
    rows: MODEL_TOTALS.map(([key, value]) => ({
      key,
      label: key,
      value,
      formattedValue: formatUsd(value),
    })),
  },

  share: {
    kind: 'share',
    segments: MODEL_TOTALS.slice(0, 5).map(([key, value]) => ({
      key,
      label: key,
      value,
      formattedValue: formatUsd(value),
    })),
  },

  donut: {
    kind: 'donut',
    segments: MODEL_TOTALS.map(([key, value]) => ({
      key,
      label: key,
      value,
      formattedValue: formatUsd(value),
    })),
    centreMetric: '$943.60',
    centreLabel: 'TOTAL',
  },

  table: {
    kind: 'table',
    columns: [
      { key: 'label', header: 'Actor', sortable: true },
      { key: 'cost', header: 'Cost', align: 'right', kind: 'data', sortable: true },
      { key: 'requests', header: 'Requests', align: 'right', kind: 'data', sortable: true },
      { key: 'tokens', header: 'Tokens', align: 'right', kind: 'data', sortable: true },
    ],
    rows: [
      ['ada@adorsys.com', 612.05, 18_402, 41_208_113],
      ['grace@adorsys.com', 208.4, 6_115, 13_998_002],
      ['ci-deploy@adorsys.com', 96.15, 41_220, 2_004_881],
      ['linus@adorsys.com', 21.8, 902, 811_400],
      ['batch-eval', 5.2, 118, 240_090],
    ].map(([label, cost, requests, tokens]) => ({
      key: String(label),
      href: `/admin/usage/actors/${encodeURIComponent(String(label))}?type=user`,
      cells: {
        label: String(label),
        cost: formatUsd(cost as number),
        requests: (requests as number).toLocaleString('en-US'),
        tokens: (tokens as number).toLocaleString('en-US'),
      },
    })),
    unit: 'actors',
    total: 5,
    hasPrev: false,
    hasNext: false,
  },

  'latency-cards': {
    kind: 'latency-cards',
    rows: [
      { key: 'gpt-4o', model: 'gpt-4o', p50Ms: 412, p95Ms: 1840, p99Ms: 4120, samples: 18_402 },
      {
        key: 'claude-sonnet-4',
        model: 'claude-sonnet-4',
        p50Ms: 690,
        p95Ms: 2210,
        p99Ms: 5980,
        samples: 6_115,
      },
      // Under 100 samples — the card renders WITHOUT p99, which is the honest reading that far
      // out the tail (`LatencyStatCards`' own rule, kept in the fixture so a reviewer sees it).
      {
        key: 'mistral-large',
        model: 'mistral-large',
        p50Ms: 320,
        p95Ms: 980,
        p99Ms: 1400,
        samples: 44,
      },
      // Zero samples — hidden entirely, never a row of dashes.
      { key: 'llama-3.1-70b', model: 'llama-3.1-70b', p50Ms: 0, p95Ms: 0, p99Ms: null, samples: 0 },
    ],
  },

  'latency-series': {
    kind: 'latency-series',
    series: [
      { key: 'p50', label: 'p50', points: days(21, (index) => 380 + 60 * Math.sin(index / 3)) },
      { key: 'p95', label: 'p95', points: days(21, (index) => 1700 + 400 * Math.sin(index / 2)) },
    ],
    scale: 'linear',
    onScaleChange: () => {},
  },
};

/** The empty counterpart of every fixture — the state each panel type must still render honest
 *  structure for (a ring outline, a still-drawn axis, an inline status line), never a collapsed
 *  zone. */
export const emptyPanelFixtures: Record<DashboardPanelType, DashboardPanelView> = {
  stat: { kind: 'stat', label: 'Total cost', metric: '$0.00' },
  'stat-group': { kind: 'stat-group', stats: [] },
  series: { kind: 'series', series: [], scale: 'linear', onScaleChange: () => {} },
  ranked: { kind: 'ranked', rows: [] },
  share: { kind: 'share', segments: [] },
  donut: { kind: 'donut', segments: [], centreLabel: undefined },
  table: { kind: 'table', columns: panelFixturesColumns(), rows: [], unit: 'actors', total: 0 },
  'latency-cards': { kind: 'latency-cards', rows: [] },
  'latency-series': {
    kind: 'latency-series',
    series: [],
    scale: 'linear',
    onScaleChange: () => {},
  },
};

function panelFixturesColumns() {
  const table = panelFixtures.table;
  return table.kind === 'table' ? table.columns : [];
}
