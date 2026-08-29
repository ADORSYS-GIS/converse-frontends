import React from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { ErrorLine } from '../../components/error-line';
import { LatencyRidgeline } from '../../components/latency-ridgeline';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { DASHBOARD_LABEL_CLASS } from '../../lib/type-roles';
import { UNWIRED_CHART_MESSAGE } from '../unwired-chart-message';
import type { LatencyDashboardProps } from './types';

// Loading-skeleton geometry for the LATENCY ridgeline, matching `LatencyRidgeline`'s own margin
// (`left: 108` for the row labels), documented in that chart's own `LoadingSkeletonGeometryNote`.
function LatencyChartSkeleton({ width, height }: { width: number; height: number }) {
  const margin = { top: 16, right: 12, bottom: 28, left: 108 };
  const plotWidth = Math.max(width - margin.left - margin.right, 0);
  const plotHeight = Math.max(height - margin.top - margin.bottom, 0);
  const rowCount = 4;
  const rowHeight = plotHeight / rowCount;
  return (
    <svg width={width} height={height} role="presentation" aria-hidden="true">
      {Array.from({ length: rowCount }, (_, index) => (
        <rect
          key={index}
          x={margin.left}
          y={margin.top + index * rowHeight + 6}
          width={plotWidth}
          height={Math.max(rowHeight - 12, 0)}
          rx={2}
          fill={SPEC_GRID}
        />
      ))}
    </svg>
  );
}

// Contract: docs/design/console-redesign/README.md §5.1 (overview.svg, dashboard 2) — the LATENCY
// zone. Carries its own status independently of SPEND: a failed latency query must not take the
// spend chart down with it.
export function LatencyDashboard({
  label = 'Latency distribution — p95 by model',
  series,
  fallbackWidth,
  height,
  status = 'ready',
  errorMessage,
  unwiredMessage,
  onRetry,
  onSelectSeries,
  formatXTick,
  actions,
  className,
}: LatencyDashboardProps) {
  // Destructured at the hook call — see `SpendDashboard`'s note on `react-hooks/refs`.
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const measuredWidth = size.width || fallbackWidth;

  return (
    // The observed element is the OUTER wrapper, not the chart's scroll box: that box only exists
    // in the chart branch now, and a ref that mounts only there would leave the loading skeleton
    // measuring `fallbackWidth` forever. Both are full-width children of this div, so the
    // measurement is identical either way.
    <div ref={ref} className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className={DASHBOARD_LABEL_CLASS}>{label}</div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      {/* Only the CHART goes inside the horizontal scroller. The error and loading states are
          prose/skeleton that wrap to the column, and putting them in the scroll box made them
          scroll with it: a horizontally-scrolled container clipped the status sentence at BOTH
          ends, rendering it as "…isn't available: the usage API doesn't report latency or
          percentile data yet. Spend, budget an…" (owner screenshot, 2026-08-29). A status line
          about a chart that is not being drawn has no reason to live in that chart's viewport. */}
      {status === 'error' ? (
        <div className="mt-4">
          <ErrorLine message={errorMessage ?? 'Failed to load latency data.'} onRetry={onRetry} />
        </div>
      ) : status === 'loading' ? (
        <div className="mt-4 flex flex-col gap-2">
          {/* The skeleton matches the chart's geometry, so it keeps the chart's own scroller. */}
          <div className="w-full overflow-x-auto overflow-y-clip">
            <LatencyChartSkeleton width={measuredWidth} height={height} />
          </div>
          <p className="text-subtle font-mono text-[11px]">Querying usage…</p>
        </div>
      ) : (
        /* `tabIndex={0}` alone (no `role="region"`) -- see `LedgerTable`'s equivalent comment for
           why a landmark role here would trip axe's `landmark-unique` once a page renders more
           than one scrollable dashboard. `overflow-y-clip` -- see `SpendDashboard`'s note on why
           `overflow-x-auto` alone also scrolls vertically. */
        <div className="mt-4 w-full overflow-x-auto overflow-y-clip" tabIndex={0}>
          <LatencyRidgeline
            series={series}
            width={measuredWidth}
            height={height}
            // Only overridden for `unwired` — see `SpendDashboard`'s equivalent comment.
            emptyMessage={
              status === 'unwired' ? (unwiredMessage ?? UNWIRED_CHART_MESSAGE) : undefined
            }
            formatXTick={formatXTick}
            onSelectSeries={onSelectSeries}
          />
        </div>
      )}
    </div>
  );
}
