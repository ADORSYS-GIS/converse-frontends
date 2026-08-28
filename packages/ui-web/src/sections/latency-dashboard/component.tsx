import React from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { ErrorLine } from '../../components/error-line';
import { LatencyRidgeline } from '../../components/latency-ridgeline';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { DASHBOARD_LABEL, UNWIRED_CHART_MESSAGE } from '../dashboard-label';
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
  label = 'LATENCY DISTRIBUTION — p95 BY MODEL',
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
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className={DASHBOARD_LABEL}>{label}</div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      {/* `tabIndex={0}` alone (no `role="region"`) -- see `LedgerTable`'s equivalent comment for
          why a landmark role here would trip axe's `landmark-unique` once a page renders more
          than one scrollable dashboard. */}
      <div ref={ref} className="mt-4 w-full overflow-x-auto" tabIndex={0}>
        {status === 'error' ? (
          <ErrorLine message={errorMessage ?? 'Failed to load latency data.'} onRetry={onRetry} />
        ) : status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <LatencyChartSkeleton width={measuredWidth} height={height} />
            <p className="text-subtle font-mono text-[10px]">Querying usage…</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
