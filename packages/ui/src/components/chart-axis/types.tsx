export interface ChartTick {
  /** Pixel position along the axis -- x for a bottom axis, y for a left axis. */
  position: number;
  label: string;
}

export interface ChartAxisBottomProps {
  ticks: ChartTick[];
  /** y-coordinate (in the parent `<Svg>`'s coordinate space) of the axis baseline. */
  y: number;
  /** x-extent of the baseline; defaults to spanning the first/last tick. */
  x1?: number;
  x2?: number;
  /** Gridlines extend upward this many px from the baseline. 0 (default) draws no gridlines. */
  gridHeight?: number;
}

export interface ChartAxisLeftProps {
  ticks: ChartTick[];
  /** x-coordinate (in the parent `<Svg>`'s coordinate space) of the axis baseline. */
  x: number;
  y1?: number;
  y2?: number;
  /** Gridlines extend rightward this many px from the baseline. 0 (default) draws no gridlines. */
  gridWidth?: number;
}
