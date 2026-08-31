import type {
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from '../../components/multi-series-spend-chart';
import type { DashboardStatus } from '../spend-dashboard';

export interface MultiSeriesSpendBoardProps {
  /** `ZoneHeading`'s own label. Defaults to overview.svg's own wording. */
  label?: string;
  series: MultiSeriesSpendSeries[];
  /** Controlled — the caller (a URL-first `apps/console` hook, per the console-ui skill's "view
   *  state lives in the URL") owns which axis transform is active. */
  scale: MultiSeriesSpendScale;
  onScaleChange: (scale: MultiSeriesSpendScale) => void;
  /**
   * Fallback width used only before the chart's own container has been measured (console-ui
   * skill "No overflow, ever": charts measure their container rather than being forced to a
   * fixed pixel width) — same contract as `SpendDashboardProps.fallbackWidth`.
   */
  fallbackWidth: number;
  height: number;
  status?: DashboardStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onSelectSeries?: (key: string | null) => void;
  formatXTick?: (date: Date) => string;
  formatTooltipTitle?: (date: Date) => string;
  formatValue?: (value: number) => string;
  /** Passed straight through to `MultiSeriesSpendChartProps.formatYTick` — override for a
   *  non-money board (a per-day COUNT, e.g. refill decisions or request volume) so its axis
   *  doesn't carry a fabricated `$` prefix. Defaults to `formatUsdAxis`. */
  formatYTick?: (value: number) => string;
  emptyMessage?: string;
  /** Appended to the chart's own caption sentence — passed straight through to
   *  `MultiSeriesSpendChartProps.truncationCaption`. */
  truncationCaption?: string;
  className?: string;
}
