import React from 'react';

import type { ChartTooltipProps } from './types';

const DEFAULT_WIDTH = 168;

/**
 * Presentational tooltip card, absolutely positioned over a chart at a data
 * point. Purely presentational by design: which point is "active" is each
 * chart primitive's own state, passed down as `x`/`y`/`rows`.
 *
 * DOM port of `@lightbridge/ui`'s `chart-tooltip` (RN `View`/`Text` ->
 * `<div>`/`<span>`). Renders in a `position: absolute` sibling to the chart's
 * `<svg>`, inside the same `position: relative` wrapper the chart itself
 * renders (see `spend-series-chart`, `histogram-chart`, `latency-ridgeline`).
 * Uses the console-ui token set (`bg-surface`, `text-ink`, `text-subtle`) --
 * the RN source hardcoded `#191919`/`CHART_TEXT_PRIMARY`/`CHART_TEXT_MUTED`,
 * which this DOM port replaces with the equivalent semantic classes since a
 * `<div>`, unlike an SVG mark, can carry a className.
 */
export function ChartTooltip({
  visible,
  x,
  y,
  title,
  rows,
  containerWidth,
  width = DEFAULT_WIDTH,
}: ChartTooltipProps) {
  if (!visible || rows.length === 0) {
    return null;
  }

  let left = x - width / 2;
  if (containerWidth !== undefined) {
    left = Math.min(Math.max(left, 4), Math.max(containerWidth - width - 4, 4));
  }

  // Estimated card height so the card sits above the anchor point without a
  // measure-then-reposition round trip, which would flash the tooltip at the
  // wrong spot for a frame on every open.
  const estimatedHeight = 16 + (title ? 16 : 0) + rows.length * 18;
  const top = Math.max(y - estimatedHeight - 8, 0);

  return (
    <div
      className="pointer-events-none absolute flex flex-col gap-1 rounded-[2px] bg-surface px-2.5 py-2 font-mono"
      style={{ left, top, width }}>
      {title ? <span className="truncate text-[11px] text-subtle">{title}</span> : null}
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-1.5">
          {row.color ? (
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: row.color }}
            />
          ) : null}
          <span className="flex-1 truncate text-xs text-ink">{row.label}</span>
          <span className="text-xs tabular-nums text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
