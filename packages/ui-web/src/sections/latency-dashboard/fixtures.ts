// overview.svg's LATENCY dashboard fixtures — real p95-PER-BUCKET shapes, not raw per-request
// samples. This distinction matters: the usage API (`openapi/usage.backend.yaml`'s
// `UsageSeriesPoint`) returns one already-computed `latency_p95_ms` per bucket, never the
// underlying requests that produced it, so `LatencyRidgelineSeries.values` here — and in the real
// adapter, `apps/console/src/containers/overview-usage.ts`'s `toLatencySeries` — is always a list
// of per-bucket percentiles. The previous version of this file generated 400 raw normal samples
// per series, which is a shape the backend can never actually hand this chart; these fixtures are
// sized and shaped the way a real response is (tens of buckets, not hundreds of samples), so a
// glance at Storybook doesn't imply a density this chart will never really show.
//
// `formatMsAxis` (`../../lib/duration`) is used directly wherever this dataset's own x-axis is
// formatted — the ad hoc `formatOverviewLatencyXTick(v) => \`${Math.round(v)}ms\`` this file used
// to export duplicated exactly what the real formatter now does properly (it never abbreviated
// past 1000ms, unlike every other axis in this console), so it is gone rather than kept alongside
// its replacement.

import type { LatencyRidgelineSeries } from '../../components/latency-ridgeline';
import { formatMs } from '../../lib/duration';

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** A plausible per-bucket p95 walk: `count` buckets, each a mean-reverting step from the last
 *  (real latency drifts bucket to bucket rather than jumping independently), clamped at 0. */
function p95Walk(count: number, mean: number, spread: number, seed: number): number[] {
  const rand = seededRandom(seed);
  const values: number[] = [];
  let previous = mean;
  for (let i = 0; i < count; i += 1) {
    const pull = (mean - previous) * 0.3;
    const jitter = (rand() - 0.5) * spread;
    previous = Math.max(previous + pull + jitter, 0);
    values.push(previous);
  }
  return values;
}

/** The row's right-hand value, in the same shape the real adapter emits (`toLatencySeries`'s own
 *  `peak p95 ${formatMs(max)}`) — kept as one function so every fixture below states its peak the
 *  same way the live panel does. */
function peakLabel(values: number[]): string {
  return `peak p95 ${formatMs(Math.max(...values))}`;
}

const gptValues = p95Walk(30, 220, 50, 1);
const llamaValues = p95Walk(30, 340, 70, 3);
const claudeValues = p95Walk(30, 900, 220, 2);
const embedValues = p95Walk(30, 60, 20, 4);

/** `RealPercentiles`/`Populated` — several models with plausible per-bucket p95 shapes across a
 *  30-bucket range (e.g. a 30-day range at a 1-day bucket). */
export const overviewLatencySeries: LatencyRidgelineSeries[] = [
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: gptValues, value: peakLabel(gptValues) },
  { key: 'llama-3.1-70b', label: 'llama-3.1-70b', values: llamaValues, value: peakLabel(llamaValues) },
  {
    key: 'claude-sonnet',
    label: 'claude-sonnet',
    values: claudeValues,
    value: `${peakLabel(claudeValues)} · over SLO`,
    breached: true,
  },
  { key: 'embed-3', label: 'embed-3', values: embedValues, value: peakLabel(embedValues) },
];

/** `SparseData` — very few buckets per model (2-4 values), the shape a short range or a
 *  low-traffic model actually produces: too little to trust a p99 over, and barely enough to draw
 *  a shape at all. Demonstrates that a ridgeline over this few points is itself the honest signal
 *  that the volume is thin, not a rendering bug. */
export const sparseLatencySeries: LatencyRidgelineSeries[] = [
  {
    key: 'gpt-4o-mini',
    label: 'gpt-4o-mini',
    values: [210, 245, 198],
    value: peakLabel([210, 245, 198]),
  },
  { key: 'embed-3', label: 'embed-3', values: [58, 63], value: peakLabel([58, 63]) },
  {
    key: 'claude-sonnet',
    label: 'claude-sonnet',
    values: [880, 940, 1_010, 905],
    value: peakLabel([880, 940, 1_010, 905]),
    breached: true,
  },
];

/** `PartiallyReported` — a mix of models with real per-bucket data and one that reported nothing
 *  at all across the range, in the exact shape `toLatencySeries` produces for that case
 *  (`values: []`, `value: 'no latency reported'`) — the per-series honesty this whole feature is
 *  built around, not a chart-wide blank. */
export const partiallyReportedLatencySeries: LatencyRidgelineSeries[] = [
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: gptValues, value: peakLabel(gptValues) },
  { key: 'llama-3.1-70b', label: 'llama-3.1-70b', values: llamaValues, value: peakLabel(llamaValues) },
  // `signal-summary` is an aggregate metric signal (an OTLP summary/histogram data point) — the
  // usage backend deliberately records no per-request latency for those (see
  // `openapi/usage.backend.yaml`'s `latency_samples` doc comment), so every bucket for it has
  // `latency_samples === 0` and no percentile ever survives into `values`.
  { key: 'signal-summary', label: 'signal-summary', values: [], value: 'no latency reported' },
];
