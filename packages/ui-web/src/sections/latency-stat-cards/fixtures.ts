import type { LatencyStatRow } from './types';

export const latencyStatRows: LatencyStatRow[] = [
  { key: 'gpt-4o', model: 'gpt-4o', p50Ms: 812, p95Ms: 2140, p99Ms: 3820, samples: 4210 },
  { key: 'gpt-4o-mini', model: 'gpt-4o-mini', p50Ms: 340, p95Ms: 910, p99Ms: 1520, samples: 1890 },
  // Below the 100-sample floor — p99 is suppressed, p50/p95 still shown.
  {
    key: 'claude-opus-4',
    model: 'claude-opus-4',
    p50Ms: 1240,
    p95Ms: 2900,
    p99Ms: 4100,
    samples: 42,
  },
  // Zero samples — hidden entirely by the component, never rendered as a dashed row.
  { key: 'embed-3', model: 'embed-3', p50Ms: 0, p95Ms: 0, p99Ms: null, samples: 0 },
];

export const latencyStatRowsEmpty: LatencyStatRow[] = [
  { key: 'embed-3', model: 'embed-3', p50Ms: 0, p95Ms: 0, p99Ms: null, samples: 0 },
];
