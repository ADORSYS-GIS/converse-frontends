import type {
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from '../../components/multi-series-spend-chart';
import type { DashboardStatus } from '../spend-dashboard';

export interface MultiSeriesSpendBoardProps {
  /** `ZoneHeading`'s own label. Defaults to overview.svg's own wording. */
  label?: string;
  /**
   * Whether this board draws its OWN heading row (converse-frontends#446).
   *
   * `'zone'` (default, and what every pre-#446 caller gets) — the `ZoneHeading` + scale
   * `SegmentedControl` this section has always rendered.
   *
   * `'none'` — chart and status only. Used when the board sits inside a `DashboardPanel`, which
   * already owns the title/subtitle/actions row: the scale toggle moves into THAT heading's
   * actions slot (the AC's "scale toggle in the panel actions slot"), and rendering a second
   * heading here would put two title rows inside one card. `scale`/`onScaleChange` are still
   * required in this mode — the chart itself reads `scale`; only the control moved.
   */
  heading?: 'zone' | 'none';
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
  /** Whether the plotted quantity can be summed across buckets and series — passed straight
   *  through to `MultiSeriesSpendChartProps.summable`. `false` on the latency board, where a sum
   *  of per-bucket percentiles is not a quantity at all (converse-frontends#449). */
  summable?: boolean;
  className?: string;
}
