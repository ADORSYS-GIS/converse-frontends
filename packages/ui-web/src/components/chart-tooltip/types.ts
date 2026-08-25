export interface ChartTooltipRow {
  key: string;
  label: string;
  /** Pre-formatted by the caller (locale, currency, units) -- same contract as StatCard's `value`. */
  value: string;
  /** Swatch colour, typically the same value `specSeriesColor` gave the mark this row describes. */
  color?: string;
}

export interface ChartTooltipProps {
  visible: boolean;
  /**
   * The chart's real `<svg>` element -- the Floating UI virtual element's
   * `contextElement` (ADR 0010 Decision 6), so `flip`/`shift` clipping detection and
   * `autoUpdate`'s scroll/resize tracking follow the actual chart rather than a
   * detached point in space. `null` before the chart has mounted its `<svg>`, in
   * which case the tooltip renders nothing regardless of `visible`.
   */
  anchorElement: SVGSVGElement | null;
  /**
   * Anchor point in `anchorElement`'s own local pixel space (its content-box
   * top-left origin) -- the active mark's plotted x/y, snapped to the nearest
   * datum by the caller (a click/focus target, not the raw pointer position).
   */
  x: number;
  y: number;
  title?: string;
  rows: ChartTooltipRow[];
}
