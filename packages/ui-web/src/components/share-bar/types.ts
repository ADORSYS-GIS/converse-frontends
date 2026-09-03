export interface ShareBarSegment {
  /** Stable identity, matched against `selectedKey` — e.g. a project or model id. */
  key: string;
  /** Display label, already localized by the caller. */
  label: string;
  /** Raw magnitude. Shares are computed from the sum of every segment's value. */
  value: number;
  /** Pre-formatted value string (e.g. `$1.35`) — caller owns i18n/units, same contract as `ChartLegendItem`. */
  formattedValue?: string;
  /** This segment has breached a configured ceiling — renders in the accent, same as `selected`. */
  breached?: boolean;
}

export interface ShareBarProps {
  segments: ShareBarSegment[];
  /** Controlled selection — drives the accent (ADR 0008 Decision 6). */
  selectedKey?: string | null;
  /** Omit for a read-only share bar. */
  onSelectSegment?: (key: string | null) => void;
  /**
   * A destination for one segment's ROW, or `undefined` for a segment that has none — the same
   * contract `RankedSeriesRows.hrefFor` holds, and the same reason it exists: a share bar's rows
   * name real entities (models, projects), and until 2026-09-03 the only way to open one was to
   * find it again in a table somewhere else on the page.
   *
   * A linked row is an `<a>` and does not toggle `selectedKey` — see `SeriesRowProps.href`. The
   * collapsed `Other (N)` segment (`key: '__other__'`, folded in by the caller) is never linked:
   * it is several entities at once and there is no page for "several".
   */
  hrefFor?: (segment: ShareBarSegment) => string | undefined;
  /** Formats each row's percentage. Defaults to whole percent, with `<1%` for non-zero rounding to nothing. */
  formatPercent?: (percent: number) => string;
  /**
   * Line rendered beneath the (still-drawn) empty track when `segments` is empty — the console's
   * empty state is an inline status line over surviving structure, never a centred placard
   * (console-ui skill "States"). Same contract as `SpendSeriesChart`'s `emptyMessage`.
   */
  emptyMessage?: string;
  className?: string;
}
