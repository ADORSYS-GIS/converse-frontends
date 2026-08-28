import type { DonutSlice } from '../../components/donut-chart';

/**
 * Per-section load status -- this dashboard failing must never take its neighbours down (same
 * contract as `spend-dashboard`'s `DashboardStatus`, kept as its own type so the two sections stay
 * parallel-PR-friendly). `'unwired'` carries the same meaning as `DashboardStatus`'s own
 * `'unwired'` -- see that type's docstring.
 */
export type SpendShareStatus = 'ready' | 'loading' | 'error' | 'unwired';

export interface SpendShareSectionProps {
  /** Uppercase tracked heading. Defaults to the section's own wording. */
  label?: string;
  slices: DonutSlice[];
  /** Ring diameter in px -- a donut is a fixed-size widget, not a full-width one (unlike `SpendDashboard`'s time series), so this is a plain size rather than a measured container width. */
  size?: number;
  status?: SpendShareStatus;
  errorMessage?: string;
  /** Overrides `UNWIRED_CHART_MESSAGE` for `status="unwired"`. */
  unwiredMessage?: string;
  onRetry?: () => void;
  /** Controlled selection -- pass the page's `selectedSeriesKey` state to keep this donut in sync with the SPEND time-series chart and its rail legend. */
  selectedKey?: string | null;
  onSelectSlice?: (key: string | null) => void;
  centreMetric?: string;
  centreLabel?: string;
  formatTooltipValue?: (slice: DonutSlice, percent: number) => string;
  formatLegendValue?: (slice: DonutSlice, percent: number) => string;
  className?: string;
}
