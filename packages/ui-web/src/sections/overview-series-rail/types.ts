import type { ChartLegendItem } from '../../components/chart-legend';

export interface OverviewSeriesRailProps {
  items: ChartLegendItem[];
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  /**
   * Shown in place of the legend when `items` is empty, instead of the section rendering blank
   * (console-ui skill "empty states are inline status lines" — `InlineStatus` "is the empty-state
   * primitive too"). `ChartLegend` itself already omits a legend for exactly one series (a single
   * series doesn't need identification, per the dataviz skill) -- that stays a silent, correct
   * no-legend render; this message is only for the *zero*-series case, which needs a reason.
   * Defaults to a generic "no series" line; Overview's own container overrides it with
   * `UNWIRED_CHART_MESSAGE` since its real reason is "never wired," not "nothing selected."
   */
  emptyMessage?: string;
  className?: string;
}
