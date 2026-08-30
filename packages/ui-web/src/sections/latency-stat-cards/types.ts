export interface LatencyStatRow {
  /** Stable identity — the model name, which is also this row's own label. */
  key: string;
  model: string;
  p50Ms: number;
  p95Ms: number;
  /**
   * `null`/`undefined` when the backend genuinely has none (`latency_samples === 0`) — see
   * `LatencyStatCardsProps.rows`' own doc comment for why a row with zero samples is hidden
   * entirely rather than rendered with a dash.
   */
  p99Ms?: number | null;
  /** How many events this model's window actually carried a latency measurement for — the same
   *  count the `latency_samples===0`/`<100` gating below reads. */
  samples: number;
}

export interface LatencyStatCardsProps {
  /**
   * A row with `samples === 0` renders nothing at all — the component itself hides it (never the
   * caller's job to pre-filter): a model with zero latency-bearing events has nothing honest to
   * show, the same "omit, don't fabricate" rule `OverviewStatRow`'s sparkline slot follows.
   *
   * A row with `samples < 100` still renders, but WITHOUT its p99 figure — a percentile that far
   * out the tail is noise below ~100 samples and degenerates toward the bucket maximum.
   */
  rows: LatencyStatRow[];
  /** Shown when every row was filtered out (all-zero-sample window) — over still-rendered
   *  structure, never a disappearing frame. */
  emptyMessage?: string;
  className?: string;
}
