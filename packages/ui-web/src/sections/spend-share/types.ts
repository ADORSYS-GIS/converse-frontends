import type { ShareBarSegment } from '../../components/share-bar';

/**
 * Per-section load status -- this dashboard failing must never take its neighbours down (same
 * contract as `spend-dashboard`'s `DashboardStatus`, kept as its own type so the two sections stay
 * parallel-PR-friendly). `'unwired'` carries the same meaning as `DashboardStatus`'s own
 * `'unwired'` -- see that type's docstring.
 */
export type SpendShareStatus = 'ready' | 'loading' | 'error' | 'unwired';

export interface SpendShareSectionProps {
  /** Section heading. Defaults to the section's own wording. */
  label?: string;
  segments: ShareBarSegment[];
  /** Total across every segment, pre-formatted (e.g. `$1.36`). Rendered as the zone's one numeral. */
  total?: string;
  status?: SpendShareStatus;
  errorMessage?: string;
  /** Overrides `UNWIRED_CHART_MESSAGE` for `status="unwired"`. */
  unwiredMessage?: string;
  onRetry?: () => void;
  /** Controlled selection -- pass the page's `selectedSeriesKey` so this stays in sync with the SPEND time-series chart. */
  selectedKey?: string | null;
  onSelectSegment?: (key: string | null) => void;
  formatPercent?: (percent: number) => string;
  /**
   * Set (instead of rendering `segments`) once this breakdown resolves to <=1 distinct value — a
   * single-band SHARE bar asserts a distribution ("here is how this splits") the data does not
   * have. Renders an inline status line in the bar's own place, heading kept above — the SAME
   * `status === 'ready' && degenerateMessage` contract `SpendDashboard`'s own prop already uses
   * (console-ui skill analytics doctrine; 2026-08-31 owner-round parity fix #3 moved this
   * suppression OFF the account overview's time-series chart and onto this component instead — a
   * single-series TIME SERIES is still a meaningful reading, a single-segment BREAKDOWN is the one
   * that asserts a shape the data doesn't have). Ignored while `loading`/`error`.
   */
  degenerateMessage?: string;
  className?: string;
}
