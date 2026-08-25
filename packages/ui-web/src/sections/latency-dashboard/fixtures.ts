// overview.svg's LATENCY dashboard, moved here verbatim from the deleted
// `pages/overview/fixtures.ts` — the same dataset `LatencyRidgeline`'s own stories use.

import type { LatencyRidgelineSeries } from '../../components/latency-ridgeline';

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
