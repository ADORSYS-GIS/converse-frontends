import type { ReactNode } from 'react';

import type { SpendSeriesSeries } from '../../components/spend-series-chart';

/**
 * Per-dashboard load status — one dashboard failing must never take its neighbour down.
 *
 * `'unwired'` is distinct from both `'loading'` (implies a request is in flight and data is
 * imminent) and the default `'ready'` rendering an empty `series`/`slices` array (implies a query
 * ran and genuinely found nothing — chart-core's own "No usage in this range." wording). Neither
 * is honest for "this data source has never been queried at all," which is what Overview's spend,
 * latency and budget zones actually are today (no usage-backend query client yet — see
 * `use-overview-screen.ts`'s `USAGE_PENDING_MESSAGE`). `'unwired'` renders the same
 * axes-stay/inline-status-line shape console-ui's empty state already uses, with wording that
 * says "never wired," never "checked and empty."
 */
export type DashboardStatus = 'ready' | 'loading' | 'error' | 'unwired';

export interface SpendDashboardProps {
  /** Uppercase tracked heading. Defaults to overview.svg's own wording. */
  label?: string;
  series: SpendSeriesSeries[];
  /** `line` (default) or `bars` — passed straight through to `SpendSeriesChart`. IA v3 phase 4's
   *  settings-overview lenses use `bars` for their own sparse, day-bucketed spend chart (build
   *  brief §3: "columns, gaps honest" — a line would visually connect days with no usage). */
  variant?: 'line' | 'bars';
  /** Passed straight through to `SpendSeriesChart` — the account lens' cumulative budget
   *  burn-down (build brief §2b/§3). See that component's own doc comment. */
  cumulative?: boolean;
  ceiling?: number;
  /**
   * Fallback width used only before the chart's own container has been measured (console-ui
   * skill "No overflow, ever": charts measure their container rather than being forced to a
   * fixed pixel width).
   */
  fallbackWidth: number;
  height: number;
  status?: DashboardStatus;
  errorMessage?: string;
  /** Overrides `UNWIRED_CHART_MESSAGE` for `status="unwired"`. */
  unwiredMessage?: string;
  /**
   * Set once `status === 'ready'` when the current breakdown resolves to <=1 distinct series — a
   * single-band chart asserts a shape ("here is how this varies") the data does not actually
   * have. Renders an `InlineStatus` line in place of the chart (heading, loading and error states
   * are unaffected — this only swaps the READY body). `undefined`/omitted renders the chart
   * normally, including the ordinary 0-series "No usage in this range." empty state, which stays
   * the chart's own job — this prop is for the DEGENERATE ONE-series case specifically, not for
   * "no data at all" (build brief finish-item §2).
   */
  degenerateMessage?: string;
  onRetry?: () => void;
  onSelectSeries?: (key: string | null) => void;
  formatXTick?: (date: Date) => string;
  formatYTick?: (value: number) => string;
  formatTooltipValue?: (value: number) => string;
  formatLegendValue?: (series: SpendSeriesSeries) => string;
  /** A slot on the heading row for whatever action the host wants beside this chart's title —
   *  unused by the real Overview screen today, whose own VIEW/FILTERS controls live in
   *  `PageHeader.controls` at every tier (shell revamp phase 3). */
  actions?: ReactNode;
  className?: string;
}
