import React from 'react';

import { splitMs } from '../../lib/duration';
import { LABEL_CLASS, META_CLASS, METRIC_COMPACT_CLASS } from '../../lib/type-roles';
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
 * ## The three percentiles are three FIGURES (owner directive, 2026-09-03)
 *
 * "'Latency by model' shall be full width. Those numbers should appear clear." Two changes, and
 * they are one change: every `latency-cards` panel in `dashboards.yaml` is `span: 2` now, and the
 * width that buys is spent on the numbers rather than on more cards per row.
 *
 * What it replaces: p50 alone at the metric size, with p95, p99 and the sample count crammed into
 * ONE 12px meta line as `p95 1.84 s · p99 4.12 s · n=18,402`. Three readings of equal standing
 * were rendered at three different weights, and the two that an operator actually chases a
 * regression with — the tail percentiles — were the ones set smallest, in a run-on line with the
 * sample count, where the `·` separators do the work a column boundary should. p50 is not the
 * headline of a latency card; it is the least interesting of the three.
 *
 * So: a labelled column each, all three at `METRIC_COMPACT_CLASS`, aligned across every card in
 * the panel by a real grid (`latency-card-figures`), with the sample count demoted to its own
 * muted line underneath — it qualifies the three figures, it is not a fourth one.
 *
 * ## The unit is beside the numeral, never inside it
 *
 * `splitMs` returns the figure and the unit separately (`412` + `ms`), so `ms`/`s` renders at
 * `META_CLASS` on the numeral's baseline instead of inheriting the numeral's own 20px mono. A
 * duration past a minute has no single unit to set beside it (`1 m 27 s` carries both), and
 * `splitMs` says so with an empty `unit` — the span is then omitted rather than a unit invented.
 *
 * Rendering is `theme.css`'s `latency-card` part, which also corrects the panel treatment: this
 * used to hand-write `bg-surface rounded-[2px] p-4`, mirroring `OverviewStatRow`'s SKELETON rather
 * than the real `StatCard` it sits beside — 2px and borderless where every other floor-sitting
 * panel in the console is 4px with a hairline.
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

/** One percentile: its name, then the figure with its unit beside it. */
function LatencyFigure({ label, ms }: { label: string; ms: number }) {
  const { value, unit } = splitMs(ms);
  return (
    <div className="latency-card-figure">
      <span className={LABEL_CLASS}>{label}</span>
      <span className="latency-card-value">
        <span className={METRIC_COMPACT_CLASS}>{value}</span>
        {unit ? <span className={META_CLASS}>{unit}</span> : null}
      </span>
    </div>
  );
}

function LatencyCard({ row }: { row: LatencyStatRow }) {
  const showP99 = row.samples >= MIN_SAMPLES_FOR_P99 && row.p99Ms != null;
  return (
    <div className="latency-card">
      <span className={LABEL_CLASS}>{row.model}</span>
      <div className="latency-card-figures">
        <LatencyFigure label="p50" ms={row.p50Ms} />
        <LatencyFigure label="p95" ms={row.p95Ms} />
        {/* The p99 COLUMN is omitted below the 100-sample floor rather than dashed: a percentile
            that far out the tail degenerates toward the bucket maximum on a thin sample, and a
            dash in a figure column reads as "we lost it" rather than "we decline to state it".
            The grid keeps three tracks either way, so a card without p99 stays aligned with the
            cards beside it instead of stretching its two figures across the width of three. */}
        {showP99 ? <LatencyFigure label="p99" ms={row.p99Ms as number} /> : null}
      </div>
      <p className={META_CLASS}>n={row.samples.toLocaleString()}</p>
    </div>
  );
}
