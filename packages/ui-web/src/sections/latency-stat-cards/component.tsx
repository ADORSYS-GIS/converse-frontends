import React from 'react';

import { formatMs } from '../../lib/duration';
import { LABEL_CLASS, META_CLASS, METRIC_CLASS } from '../../lib/type-roles';
import { InlineStatus } from '../../components/inline-status';
import type { LatencyStatCardsProps, LatencyStatRow } from './types';

const MIN_SAMPLES_FOR_P99 = 100;

/**
 * Per-model latency, as a row of self-panelled cards (IA v3 phase 4 §3) — the phase's own
 * measurement is what shaped this exactly: the usage backend's events are aggregate metric
 * signals, so a per-request latency TIME SERIES was explicitly rejected (build brief §8's "DO NOT
 * BUILD" list); a per-model summary stat — p50/p95/n, p99 once there is enough tail to trust it —
 * is what the backend can actually answer honestly.
 *
 * Mirrors `OverviewStatRow`'s panel shell rather than reusing `StatCard` itself: a latency card
 * carries three numbers and a sample count, not one metric plus an optional delta, so it needed
 * its own small body rather than a delta-slot repurposed to mean something it does not.
 */
export function LatencyStatCards({
  rows,
  emptyMessage = 'No latency-bearing events in this range.',
  className,
}: LatencyStatCardsProps) {
  // A model with zero latency-bearing samples has nothing honest to show — hidden here, once,
  // rather than left to every caller to pre-filter (`types.ts`'s own doc comment).
  const visible = rows.filter((row) => row.samples > 0);

  if (visible.length === 0) {
    return (
      <div className={className}>
        <InlineStatus>{emptyMessage}</InlineStatus>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 ${className ?? ''}`}>
      {visible.map((row) => (
        <LatencyCard key={row.key} row={row} />
      ))}
    </div>
  );
}

function LatencyCard({ row }: { row: LatencyStatRow }) {
  const showP99 = row.samples >= MIN_SAMPLES_FOR_P99 && row.p99Ms != null;
  return (
    <div className="bg-surface rounded-[2px] p-4">
      <span className={LABEL_CLASS}>{row.model}</span>
      <div className="mt-2">
        <span className={METRIC_CLASS}>{formatMs(row.p50Ms)}</span>
      </div>
      <p className={`${META_CLASS} mt-1`}>
        p95 {formatMs(row.p95Ms)}
        {showP99 ? ` · p99 ${formatMs(row.p99Ms as number)}` : ''} · n=
        {row.samples.toLocaleString()}
      </p>
    </div>
  );
}
