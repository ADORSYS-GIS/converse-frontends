import { stack as d3Stack, stackOffsetNone, stackOrderNone } from 'd3-shape';

/**
 * Stacked-bar layout math — the DOM-free half of `packages/ui-web`'s `StackedBarChart`, living
 * here for the same reason `arcs.ts` and `bins.ts` do (ADR 0009 Decision 5: `chart-core` owns the
 * d3 math with no DOM/React in it, `ui-web` owns the `<svg>`).
 *
 * **Why this exists at all, given ADR 0013 D5 banned stacked bars.** It did, and on measured
 * grounds: a stack asks a reader to compare segment LENGTHS that do not share a baseline, which is
 * the second-worst perceptual channel after area, and the console's own data is routinely one
 * series at ~95% share — under which every other segment is a sliver and the stack degenerates
 * into a single bar with decoration. The owner overruled it for ONE question on 2026-09-03: daily
 * spend × model, where the reader's first question really is "what did we spend that day", the
 * total is the primary reading, and the per-model split is the secondary one. That is precisely
 * the case a stack is the right mark for — and it is the case a superposed line chart serves
 * worst, since a line chart has no total at all.
 *
 * The caveat did not go away, so it is enforced HERE rather than left to a caller's discretion:
 * `computeStackLayout` reports `topShare`, and `ui-web`'s chart states the 95%-top-1 caption
 * whenever it is exceeded (ADR 0015 D5 amendment). A stack that is really one bar says so.
 *
 * Two rules this module holds, both mirroring `arcs.ts`:
 *  - **Order is by TOTAL, descending**, computed once here, and every consumer (segment colour,
 *    tooltip row order, the `Other (N)` collapse) reads that one order. A stack whose segment
 *    colours disagreed with its tooltip's row order is unreadable in exactly the way a stack can
 *    least afford.
 *  - **Negatives clamp to 0.** A negative segment in a part-to-whole mark either inverts the bar
 *    or silently shortens the one below it; the console's money path (`safeCost`) already clamps
 *    per point, and this is the second, unconditional guard.
 */

/** The `Other (N)` tail's key, matching `collapseDonutTail`'s own sentinel so a consumer that
 *  special-cases one special-cases both. */
export const STACK_OTHER_KEY = '__other__';

export interface StackSeriesInput {
  key: string;
  /** Already resolved/localized by the caller — never a raw id. */
  label: string;
  points: readonly { x: Date; y: number }[];
}

export interface StackSegment {
  key: string;
  label: string;
  /** Series-rank index — the slot `specSeriesColor` walks. Constant across every bucket, so one
   *  model keeps one colour along the whole axis. */
  index: number;
  /** The TRUE value, clamped at 0. Never the plotted offset. */
  value: number;
  /** Stack offsets in DATA units (not pixels): `y1 - y0 === value`. */
  y0: number;
  y1: number;
}

export interface StackBucket {
  x: Date;
  total: number;
  /** Rank order, tallest series first — bottom of the bar to top. Only segments with `value > 0`
   *  survive: a zero segment is a zero-height rect that still eats a hit target. */
  segments: StackSegment[];
}

export interface StackSeriesRank {
  key: string;
  label: string;
  index: number;
  total: number;
  /** Share of `grandTotal`, 0–100. */
  percent: number;
}

export interface StackLayout {
  buckets: StackBucket[];
  /** Every plotted series in rank order, `Other (N)` last when the tail was collapsed. */
  order: StackSeriesRank[];
  /** Sum over every bucket and series — the honest period total a stacked board can state. */
  grandTotal: number;
  /** The tallest bar. The y domain is `[0, maxTotal]`. */
  maxTotal: number;
  /** The top-ranked series' share of `grandTotal`, 0–100. `0` when nothing is plotted. */
  topShare: number;
  /** How many series were folded into `Other (N)`; `0` when nothing was collapsed. */
  collapsedCount: number;
}

export interface StackLayoutOptions {
  /** Series kept before the tail folds into one `Other (N)`. Omit (or pass a non-positive value)
   *  to keep every series — the caller's own density decision, exactly as `collapseDonutTail`. */
  topN?: number;
  /** How the collapsed tail is named. Defaults to `Other (N)`. */
  otherLabel?: (count: number) => string;
}

const clamp = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

const defaultOtherLabel = (count: number) => `Other (${count})`;

/**
 * `series` → one stacked bucket per distinct timestamp across all of them.
 *
 * The timestamp axis is the UNION of every series' own, ascending — a series that reported no
 * point for a bucket contributes 0 to it rather than shifting the bar, which is the difference
 * between "spent nothing that day" (true, and what a stack should show) and "this day does not
 * exist" (false, and what a per-series index would produce).
 *
 * Returns an empty layout for empty input, which is the signal the renderer uses to draw its
 * empty state rather than an axis over nothing.
 */
export function computeStackLayout(
  series: readonly StackSeriesInput[],
  options: StackLayoutOptions = {}
): StackLayout {
  const empty: StackLayout = {
    buckets: [],
    order: [],
    grandTotal: 0,
    maxTotal: 0,
    topShare: 0,
    collapsedCount: 0,
  };
  if (series.length === 0) return empty;

  // Rank first: the collapse, the colours and the tooltip all read this one order.
  const totals = series.map((s) => ({
    series: s,
    total: s.points.reduce((sum, point) => sum + clamp(point.y), 0),
  }));
  const ranked = totals
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.series.key.localeCompare(b.series.key));
  if (ranked.length === 0) return empty;

  const topN = options.topN;
  const keepCount =
    typeof topN === 'number' && Number.isFinite(topN) && topN >= 1
      ? Math.min(Math.floor(topN), ranked.length)
      : ranked.length;
  const head = ranked.slice(0, keepCount);
  const tail = ranked.slice(keepCount);

  const timestamps = Array.from(
    new Set(
      series.flatMap((s) => s.points.filter((p) => Number.isFinite(p.y)).map((p) => p.x.getTime()))
    )
  ).sort((a, b) => a - b);
  if (timestamps.length === 0) return empty;

  // One row per bucket, one column per kept series (plus the folded tail). The tail is summed
  // per bucket — an `Other` bar segment that summed the tail's PERIOD total into one bucket would
  // be the single most misleading rect on the board.
  const otherLabel = (options.otherLabel ?? defaultOtherLabel)(tail.length);
  const columns: StackSeriesRank[] = head.map((entry, index) => ({
    key: entry.series.key,
    label: entry.series.label,
    index,
    total: entry.total,
    percent: 0,
  }));
  if (tail.length > 0) {
    columns.push({
      key: STACK_OTHER_KEY,
      label: otherLabel,
      index: columns.length,
      total: tail.reduce((sum, entry) => sum + entry.total, 0),
      percent: 0,
    });
  }

  const valueAt = new Map<string, Map<number, number>>();
  for (const entry of head) {
    const perBucket = new Map<number, number>();
    for (const point of entry.series.points) perBucket.set(point.x.getTime(), clamp(point.y));
    valueAt.set(entry.series.key, perBucket);
  }
  if (tail.length > 0) {
    const perBucket = new Map<number, number>();
    for (const entry of tail) {
      for (const point of entry.series.points) {
        const time = point.x.getTime();
        perBucket.set(time, (perBucket.get(time) ?? 0) + clamp(point.y));
      }
    }
    valueAt.set(STACK_OTHER_KEY, perBucket);
  }

  const rows = timestamps.map((time) => {
    const row: Record<string, number> = { __time__: time };
    for (const column of columns) row[column.key] = valueAt.get(column.key)?.get(time) ?? 0;
    return row;
  });

  // `stackOrderNone`/`stackOffsetNone`: the order is OURS (rank, computed above) and the baseline
  // is a real zero. d3's own orders would re-sort per chart and decouple colour from rank.
  const stacked = d3Stack<Record<string, number>>()
    .keys(columns.map((column) => column.key))
    .order(stackOrderNone)
    .offset(stackOffsetNone)(rows);

  const buckets: StackBucket[] = timestamps.map((time, rowIndex) => {
    const segments: StackSegment[] = [];
    let total = 0;
    stacked.forEach((columnSeries, columnIndex) => {
      const [y0, y1] = columnSeries[rowIndex];
      const value = y1 - y0;
      total = Math.max(total, y1);
      if (value <= 0) return;
      const column = columns[columnIndex];
      segments.push({ key: column.key, label: column.label, index: column.index, value, y0, y1 });
    });
    return { x: new Date(time), total, segments };
  });

  const grandTotal = columns.reduce((sum, column) => sum + column.total, 0);
  for (const column of columns) {
    column.percent = grandTotal > 0 ? (column.total / grandTotal) * 100 : 0;
  }

  return {
    buckets,
    order: columns,
    grandTotal,
    maxTotal: buckets.reduce((max, bucket) => Math.max(max, bucket.total), 0),
    topShare: columns[0]?.percent ?? 0,
    collapsedCount: tail.length,
  };
}

/**
 * The share above which a stack is really ONE bar wearing a legend — ADR 0015 D5's own measured
 * figure, kept as the constant the caption is derived from rather than as a number typed into a
 * sentence.
 */
export const STACK_DOMINANT_SHARE = 95;

/**
 * The honesty caption a dominated stack must carry, or `null` when the split is worth reading.
 *
 * The 2026-09-03 ruling allowed stacked bars for daily spend × model; it did NOT retract the
 * measurement that motivated the ban. So the caveat travels with the mark: when the top series is
 * over `STACK_DOMINANT_SHARE` of the period, the board says so in words, in the same place a log
 * axis states its own trade-off (`scaleAxisCaption`). Exported as a pure function so `static`
 * (report) mode can print the identical sentence in the Typst template's chrome.
 */
export function stackDominanceCaption(layout: StackLayout): string | null {
  if (layout.order.length === 0 || layout.topShare <= STACK_DOMINANT_SHARE) return null;
  const top = layout.order[0];
  return (
    `${top.label} is ${Math.round(top.percent)}% of this period's total — the other segments are ` +
    'slivers at this scale, and the per-model split is easier to read on the ranked breakdown ' +
    'than on this stack.'
  );
}
