import React from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SpendSeriesChart } from '../../components/spend-series-chart';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { ZoneHeading } from '../../lib/zone-heading';
import { UNWIRED_CHART_MESSAGE } from '../unwired-chart-message';
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
// The chart measures its own container (`useResizeObserver`) and that measurement is
// AUTHORITATIVE (phase 9, Addition D — owner screenshot: the card scrolled sideways, clipping the
// series' left edge and the legend's first label). A chart is a compressing surface, not a
// panning one — "wide content scrolls in its own container" (console-ui skill "No overflow,
// ever") is the LEDGER's rule, not this one, and giving this container `overflow-x-auto` too was
// exactly the defect: the moment anything (a resize mid-flight, a legend row a hair wider than
// its box) made the content transiently wider than the measured width, the box became scrollable
// and could render scrolled, which is a worse failure than a chart that is briefly the wrong
// size — `useResizeObserver` already re-measures on every resize and `width={measuredWidth}` is
// threaded straight into `SpendSeriesChart`'s `<svg>`, so there is nothing left for a scrollbar
// to be a safety net FOR.
export function SpendDashboard({
  label = 'Spend — by project and model',
  series,
  fallbackWidth,
  height,
  status = 'ready',
  errorMessage,
  unwiredMessage,
  onRetry,
  onSelectSeries,
  formatXTick,
  formatYTick,
  formatTooltipValue,
  formatLegendValue,
  variant,
  cumulative,
  ceiling,
  degenerateMessage,
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
      <ZoneHeading label={label} actions={actions} />
      <div ref={ref} className="mt-4 w-full">
        {status === 'error' ? (
          <ErrorLine message={errorMessage ?? 'Failed to load spend data.'} onRetry={onRetry} />
        ) : status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <SpendChartSkeleton width={measuredWidth} height={height} />
            {/* Status text — sans (phase 9 consistency pass: this used to be mono). */}
            <p className="text-subtle font-sans text-[10px]">Querying usage…</p>
          </div>
        ) : status === 'ready' && degenerateMessage ? (
          // A single-band chart asserts a shape the data doesn't have — an inline status line
          // over still-rendered STRUCTURE would need the axes to stay, but there is no honest
          // axis to draw for one band either, so this replaces the whole chart body (heading
          // stays, above) rather than drawing an empty frame around one line.
          <InlineStatus>{degenerateMessage}</InlineStatus>
        ) : (
          <SpendSeriesChart
            series={series}
            width={measuredWidth}
            height={height}
            // Only overridden for `unwired`: the `ready` path (including a genuinely-empty
            // `series`) keeps the chart's own "No usage in this range." default, which asserts a
            // completed query found nothing — a different fact from "never queried."
            emptyMessage={
              status === 'unwired' ? (unwiredMessage ?? UNWIRED_CHART_MESSAGE) : undefined
            }
            formatXTick={formatXTick}
            formatYTick={formatYTick}
            formatTooltipValue={formatTooltipValue}
            formatLegendValue={formatLegendValue}
            onSelectSeries={onSelectSeries}
            variant={variant}
            cumulative={cumulative}
            ceiling={ceiling}
          />
        )}
      </div>
    </div>
  );
}
