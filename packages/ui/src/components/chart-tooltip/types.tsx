export interface ChartTooltipRow {
  key: string;
  label: string;
  /** Pre-formatted by the caller (locale, currency, units) -- same contract as StatCard's `value`. */
  value: string;
  /** Swatch colour, typically the same value `seriesColor` gave the mark this row describes. */
  color?: string;
}

export interface ChartTooltipProps {
  visible: boolean;
  /** Anchor point, in the same pixel space as the chart's `<Svg>` (i.e. the wrapping `<View>`'s coordinates). */
  x: number;
  y: number;
  title?: string;
  rows: ChartTooltipRow[];
  /** Clamp the tooltip within this width so it never overflows its chart -- omit to anchor unclamped. */
  containerWidth?: number;
  /** Tooltip card width in px, used for centring/clamping. */
  width?: number;
}
