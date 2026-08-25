import React from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { SpendSeriesChart } from '../../components/spend-series-chart';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { DASHBOARD_LABEL } from '../dashboard-label';
import type { SpendDashboardProps } from './types';

// Loading-skeleton geometry for the SPEND chart, matching the exact frame the chart itself
// computes: `DEFAULT_CHART_MARGIN` overridden with `left: 52` (`SpendSeriesChart`'s own margin),
// documented as the consumer's job in `spend-series-chart`'s own `LoadingSkeletonGeometryNote`
// story.
function SpendChartSkeleton({ width, height }: { width: number; height: number }) {
  const margin = { top: 12, right: 12, bottom: 28, left: 52 };
  const plotWidth = Math.max(width - margin.left - margin.right, 0);
  const plotHeight = Math.max(height - margin.top - margin.bottom, 0);
  const barCount = 8;
  const gap = 14;
  const barWidth = (plotWidth - gap * (barCount - 1)) / barCount;
  return (
    <svg width={width} height={height} role="presentation" aria-hidden="true">
      {Array.from({ length: barCount }, (_, index) => {
        const barHeight = plotHeight * (0.35 + 0.5 * ((index % 3) / 2));
        return (
          <rect
            key={index}
            x={margin.left + index * (barWidth + gap)}
            y={margin.top + plotHeight - barHeight}
            width={Math.max(barWidth, 1)}
            height={barHeight}
            rx={2}
            fill={SPEC_GRID}
          />
        );
      })}
    </svg>
  );
}

// Contract: docs/design/console-redesign/README.md §5.1 (overview.svg, dashboard 1) — the SPEND
// zone: heading row (with its compact-tier trigger slot) above a full-width chart on the floor,
// never in a card.
//
// The chart measures its own container (`useResizeObserver`) rather than forcing a width;
// `fallbackWidth` only covers the window before the first `ResizeObserver` report lands. The
// container also carries `overflow-x-auto` as a second, independent line of defence, so the chart
// never blows the page open during that unmeasured window (or on a host where `ResizeObserver` is
// unavailable) — the SVG itself never learns to shrink, only the container's own scroll makes
// that safe.
export function SpendDashboard({
  label = 'SPEND — BY PROJECT AND MODEL',
  series,
  fallbackWidth,
  height,
  status = 'ready',
  errorMessage,
  onRetry,
  onSelectSeries,
  formatXTick,
  formatYTick,
  formatTooltipValue,
  formatLegendValue,
  actions,
  className,
}: SpendDashboardProps) {
  // Destructured at the hook call, never read off the returned object during render — reading
  // `container.size` / `container.ref` as members taints the whole value for `react-hooks/refs`
  // ("Cannot access refs during render"), which is exactly the error the deleted `OverviewPage`
  // carried eight times.
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const measuredWidth = size.width || fallbackWidth;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className={DASHBOARD_LABEL}>{label}</div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      {/* `tabIndex={0}` alone (no `role="region"`) -- see `LedgerTable`'s equivalent comment for
          why a landmark role here would trip axe's `landmark-unique` once a page renders more
          than one scrollable dashboard. */}
      <div ref={ref} className={cn('mt-4 w-full overflow-x-auto')} tabIndex={0}>
        {status === 'error' ? (
          <ErrorLine message={errorMessage ?? 'Failed to load spend data.'} onRetry={onRetry} />
        ) : status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <SpendChartSkeleton width={measuredWidth} height={height} />
            <p className="text-subtle font-mono text-[10px]">Querying usage…</p>
          </div>
        ) : (
          <SpendSeriesChart
            series={series}
            width={measuredWidth}
            height={height}
            formatXTick={formatXTick}
            formatYTick={formatYTick}
            formatTooltipValue={formatTooltipValue}
            formatLegendValue={formatLegendValue}
            onSelectSeries={onSelectSeries}
          />
        )}
      </div>
    </div>
  );
}
