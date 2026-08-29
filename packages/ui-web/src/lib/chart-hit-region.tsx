import React from 'react';

/**
 * The transparent hit target a chart primitive lays over its plot, one per datum.
 *
 * Written out identically in `SpendSeriesChart`, `LatencyRidgeline` and `HistogramChart` before
 * this module existed — same element, same four declarations, same reason. It is a `<button>` and
 * not a `<div>` on purpose: the plot itself is `<path>`/`<rect>` inside a canvas nothing can
 * focus, so this is the only element in a chart the Tab key reaches, and it is what Floating UI's
 * reference props bind to. Paint is `theme.css`'s `chart-hit-region`.
 *
 * `style` carries the box, because the box is per-datum arithmetic (a band's step, a ridge's
 * amplitude, a bar's width) that no class can express. Everything else — `aria-label`, the hover
 * and reference props, `onClick` — is forwarded untouched.
 */
export type ChartHitRegionProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'type'
>;

export function ChartHitRegion(props: ChartHitRegionProps) {
  return <button type="button" {...props} className="chart-hit-region" />;
}
