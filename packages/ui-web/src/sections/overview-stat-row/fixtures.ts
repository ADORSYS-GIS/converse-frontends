// overview.svg's stat row, moved here verbatim from the deleted `pages/overview/fixtures.ts`.

import type { OverviewStatCardData } from './types';

export const overviewStatCards: OverviewStatCardData[] = [
  {
    key: 'spend-this-month',
    label: 'Spend this month',
    metric: '$142.55',
    delta: { direction: 'up', label: '18% vs prev 30d' },
    sparklineData: [96, 92, 98, 88, 91, 84, 87, 79, 74],
  },
  {
    key: 'active-projects',
    label: 'Active projects',
    metric: '6',
    delta: { direction: 'flat', label: 'no change' },
    sparklineData: [6, 6, 5, 5, 5, 6, 6, 6, 6],
  },
  {
    key: 'active-api-keys',
    label: 'Active API keys',
    metric: '23',
    delta: { direction: 'up', label: '2 this week' },
    sparklineData: [17, 18, 18, 19, 19, 20, 21, 22, 23],
  },
  {
    key: 'requests-today',
    label: 'Requests today',
    metric: '41,208',
    delta: { direction: 'down', label: '8% vs yesterday' },
    sparklineData: [38400, 37900, 38600, 37200, 37700, 36600, 36900, 36200, 36600],
  },
];

export const overviewEmptyStatCards: OverviewStatCardData[] = [
  {
    key: 'spend-this-month',
    label: 'Spend this month',
    metric: '$0.00',
    sparklineData: [0, 0],
  },
  {
    key: 'active-projects',
    label: 'Active projects',
    metric: '1',
    sparklineData: [1, 1],
  },
  {
    key: 'active-api-keys',
    label: 'Active API keys',
    metric: '0',
    sparklineData: [0, 0],
  },
  {
    key: 'requests-today',
    label: 'Requests today',
    metric: '0',
    sparklineData: [0, 0],
  },
];

// #273 — the real state of Overview's PROJECTS/API KEYS cards today: the counts are live, but no
// trend data exists (no usage-backend query client), so `sparklineData` is omitted entirely
// rather than passed as `[0, 0]` (which, unlike this fixture, would be an honest flat trend for an
// account that IS wired and genuinely had zero activity every day -- see `overviewEmptyStatCards`
// above for that case).
export const overviewUnwiredStatCards: OverviewStatCardData[] = [
  { key: 'projects', label: 'Projects', metric: '6' },
  { key: 'keys', label: 'API keys', metric: '23' },
];
