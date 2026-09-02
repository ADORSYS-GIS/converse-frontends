export interface MultiSeriesSpendPoint {
  x: Date;
  y: number;
}

export interface MultiSeriesSpendSeries {
  /** Stable identity — matched against the chart's own hover/selection state (driven by the
   *  line/point hit targets, not a legend — see `component.tsx`'s doc comment). */
  key: string;
  /** Display label, already localized/resolved by the caller (a real model/project/account
   *  name — never a raw id, per the console-ui skill's "never a raw account UUID as a visible
   *  label"). */
  label: string;
  points: MultiSeriesSpendPoint[];
  /** This series has breached a configured ceiling — always renders in the accent, regardless of
   *  hover/selection, same contract as `SpendSeriesChart.series[].breached`. */
  breached?: boolean;
  /**
   * Draw this line dashed rather than solid.
   *
   * Exactly one meaning, and it is the reason this exists: **this series is not the period the
   * page is about.** A comparison overlay (`compare: true` in `dashboards.yaml` — the previous
   * window, re-based forward so it sits under the current one) must be distinguishable from the
   * current period at a glance and WITHOUT a legend, which this console does not have
   * (`component.tsx`'s "values on hover, never a static per-series list" ruling). Colour alone
   * cannot carry it: rank-2 grey is also what an ordinary second account or model gets.
   *
   * Deliberately not a general styling hook — nothing here reads it except the line's own
   * `stroke-dasharray`, and no caller should set it to mean "de-emphasise", which is what
   * hover dimming already does.
   */
  dashed?: boolean;
}

/**
 * How the shared y-axis maps raw dollar values to pixels — see `component.tsx`'s own doc comment
 * for the honesty trade-off each one makes. Every variant plots the SAME underlying `series`; only
 * the axis transform differs. Tooltip totals/shares are always the true dollar sum, independent
 * of this prop.
 */
export type MultiSeriesSpendScale = 'linear' | 'log' | 'indexed';

export interface MultiSeriesSpendChartProps {
  /** One line per series, all sharing one set of axes — never folded into an "Other" bucket; the
   *  owner's own ask was "all models... all on the same graph." */
  series: MultiSeriesSpendSeries[];
  width: number;
  height: number;
  /** `linear` (default) plots raw dollars — honest, but a dominant series flattens the rest to
   *  the baseline. `log` plots log10 of each value — every series stays visible, at the cost of
   *  equal spacing meaning equal RATIO, not equal dollars (the axis caption says so). `indexed`
   *  normalizes each series to its own period max (`y / seriesMax * 100`) — a shape comparison,
   *  never a magnitude one (the axis reads "% of series peak"). */
  scale?: MultiSeriesSpendScale;
  formatXTick?: (date: Date) => string;
  formatTooltipTitle?: (date: Date) => string;
  /** Formats a true dollar amount — the tooltip's per-series rows and the caption's period total.
   *  Always the RAW value, independent of `scale`. Defaults to `formatUsd`. */
  formatValue?: (value: number) => string;
  /**
   * Formats the `linear`/`log` y-axis tick labels. Defaults to `formatUsdAxis` — this component
   * started as a SPEND chart and every existing caller plots dollars, so the default stays money.
   * A non-money caller (a per-day COUNT board — refill decisions, request volume) overrides this
   * rather than living with a fabricated `$` prefix on a count; `formatValue` alone was not
   * enough to fix that, since it only reaches the tooltip/caption, never the axis. Has no effect
   * on `scale="indexed"`, whose ticks are always a `%` of series peak regardless of unit.
   */
  formatYTick?: (value: number) => string;
  /** Fires when a line/point is clicked (pinned selection) — mirrors `SpendSeriesChart`'s own
   *  `onSelectSeries` contract. */
  onSelectSeries?: (key: string | null) => void;
  /** Shown in place of the chart when `series` has no plottable points at all. */
  emptyMessage?: string;
  /** Appended to the board's own caption sentence (period total, zero-spend tail count) when the
   *  caller's own fan-out capped its scope — same contract as
   *  `use-usage-overview-screen.ts`'s `truncationCaption` ("Showing the top 25 of 61 accounts."),
   *  omitted entirely when nothing was truncated. */
  truncationCaption?: string;
  /**
   * Print/export mode (converse-frontends#453, the Typst report pipeline): the component renders
   * a STANDALONE `<svg>` as its root element — no wrapper `<div>`, no captions, no pointer
   * hit-regions, no hover/selection state and **no Floating UI tooltip** — so
   * `renderToStaticMarkup` yields a document that can be written straight to an `.svg` file and
   * embedded by `image()` in a `.typ` template.
   *
   * It is a MODE, not a styling flag: everything it removes is an interaction the paper cannot
   * carry. The two captions it drops (the log/indexed axis note and the period-total summary) are
   * real content, so they are NOT lost — `scaleAxisCaption` and `buildSummaryCaption` are exported
   * for the caller to place in the report's own chrome, which is where the Typst template puts
   * them.
   *
   * Never toggled at runtime: a chart is either on screen or in a report.
   */
  static?: boolean;
  className?: string;
}
