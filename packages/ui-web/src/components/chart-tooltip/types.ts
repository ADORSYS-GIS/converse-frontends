import type { CSSProperties } from 'react';

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
  title?: string;
  rows: ChartTooltipRow[];
  /**
   * Floating UI wiring from this chart's own `useChartTooltipFloating()` call --
   * `ChartTooltip` is purely presentational and owns no positioning of its own. Positioning has
   * to live with whichever component renders the interactive hit-region elements a pointer, tap,
   * or keyboard focus actually lands on (`use-chart-tooltip-floating`'s docstring explains why:
   * `useClientPoint` can only live-track the cursor off `reference` handlers spread onto those
   * elements, and `ChartTooltip` never rendered them).
   */
  setFloating: (node: HTMLElement | null) => void;
  floatingStyles: CSSProperties;
  getFloatingProps: () => Record<string, unknown>;
}
