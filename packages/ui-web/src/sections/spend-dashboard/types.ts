import type { ReactNode } from 'react';

import type { SpendSeriesSeries } from '../../components/spend-series-chart';

/** Per-dashboard load status — one dashboard failing must never take its neighbour down. */
export type DashboardStatus = 'ready' | 'loading' | 'error';

export interface SpendDashboardProps {
  /** Uppercase tracked heading. Defaults to overview.svg's own wording. */
  label?: string;
  series: SpendSeriesSeries[];
  /**
   * Fallback width used only before the chart's own container has been measured (console-ui
   * skill "No overflow, ever": charts measure their container rather than being forced to a
   * fixed pixel width).
   */
  fallbackWidth: number;
  height: number;
  status?: DashboardStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onSelectSeries?: (key: string | null) => void;
  formatXTick?: (date: Date) => string;
  formatYTick?: (value: number) => string;
  formatTooltipValue?: (value: number) => string;
  formatLegendValue?: (series: SpendSeriesSeries) => string;
  /**
   * Compact-tier slot on the heading row — the `SectionSheetTrigger`s for the rail sections that
   * parameterise this chart (VIEW, FILTERS). Empty at `lg`, where the rail is persistent.
   */
  actions?: ReactNode;
  className?: string;
}
