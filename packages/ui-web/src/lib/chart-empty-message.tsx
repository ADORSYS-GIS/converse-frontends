import React from 'react';

/**
 * The inline status line a chart shows in place of its plot when there is nothing to draw.
 *
 * It is DOM text, NOT an SVG `<text>` — owner-reported production bug, 2026-08-29. SVG text never
 * wraps, and this line is centred on the plot, so any message longer than the plot is wide spills
 * off BOTH ends at once. That is exactly how the latency zone rendered its real copy: "…isn't
 * available: the usage API doesn't report latency or percentile data yet. Spend, budget an…",
 * clipped head and tail. Inset to the plot area and left to wrap, it is also what the console-ui
 * skill asks for — "an inline mono status line above still-rendered structure (headers/axes
 * stay)" — rather than the centred placard the same skill forbids.
 *
 * `SpendSeriesChart` and `LatencyRidgeline` each carried this element, its class list, its inline
 * inset and this note independently; `HistogramChart` still had the SVG `<text>` the bug report
 * was about. One module is what stops the fix from being re-applied a fourth time by hand.
 *
 * The caller supplies the plot rectangle it should sit in — its own margins and plot height, which
 * are numbers no class can carry. `theme.css`'s `chart-empty-message` owns the rest, including the
 * half-height correction that turns `top` into a true vertical centre.
 *
 * The parent MUST be positioned (`position: relative`); every chart's outer frame already is.
 */
export interface ChartEmptyMessageProps {
  /** Inset from the frame's left edge — the chart's own `MARGIN.left`. */
  left: number;
  /** Inset from the frame's right edge — the chart's own `MARGIN.right`. */
  right: number;
  /** The vertical centre of the plot area, `MARGIN.top + plotHeight / 2`. */
  top: number;
  children: React.ReactNode;
}

export function ChartEmptyMessage({ left, right, top, children }: ChartEmptyMessageProps) {
  return (
    <p className="chart-empty-message" style={{ left, right, top }}>
      {children}
    </p>
  );
}
