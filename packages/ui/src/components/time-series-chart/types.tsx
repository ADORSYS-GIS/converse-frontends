export interface TimeSeriesPoint {
  x: Date;
  y: number;
}

export interface TimeSeriesSeries {
  key: string;
  label: string;
  points: TimeSeriesPoint[];
  /** This series has breached a configured ceiling -- always renders in the accent, selected or not. */
  breached?: boolean;
}

export interface TimeSeriesChartProps {
  series: TimeSeriesSeries[];
  width: number;
  height: number;
  /** `line` (default) draws overlaid lines with a wash under the selected series; `bars` draws grouped columns per timestamp. */
  variant?: 'line' | 'bars';
  formatXTick?: (date: Date) => string;
  formatYTick?: (value: number) => string;
  formatTooltipValue?: (value: number) => string;
  formatTooltipTitle?: (date: Date) => string;
  /** Fires when a legend item is tapped, in addition to the chart's own selection highlight. */
  onSelectSeries?: (key: string | null) => void;
}
