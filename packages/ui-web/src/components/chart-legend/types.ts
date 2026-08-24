export interface ChartLegendItem {
  /** Stable identity, e.g. a model id or project id -- matched against `selectedKey`. */
  key: string;
  /** Display label, already localized/formatted by the caller. */
  label: string;
  /** Pre-formatted value string (e.g. `$61.20`) -- caller owns i18n/units, same contract as `ChartTooltipRow`'s `value`. */
  value?: string;
  /** This series has breached a configured ceiling -- renders in the accent, same as `selected`. */
  breached?: boolean;
}

export interface ChartLegendProps {
  /**
   * Series in the same order the chart itself draws them -- the legend
   * resolves colour from that order via `specSeriesColor`, so a legend built
   * from a different order than the chart's marks will mislabel.
   */
  items: ChartLegendItem[];
  /** The currently selected series key, or `null`/`undefined` for none. Drives the accent per ADR-0008 Decision 6. */
  selectedKey?: string | null;
  /** Select/deselect a legend item to in addition to the chart's own selection highlight. Omit for a read-only legend. */
  onSelectKey?: (key: string | null) => void;
}
