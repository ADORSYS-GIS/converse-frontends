import React from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { ErrorLine } from '../../components/error-line';
import { LatencyRidgeline } from '../../components/latency-ridgeline';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { LABEL_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
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
//
// The default label reads "p95 PER BUCKET, BY MODEL", not "p95 BY MODEL": the usage API
// (`openapi/usage.backend.yaml`'s `UsageSeriesPoint`) returns one already-computed `latency_p95_ms`
// PER BUCKET, not raw per-request samples — a percentile over a percentile is not a thing, so this
// chart cannot show "the distribution of requests," only "the distribution of this model's own
// per-bucket p95 across the selected range." Naming that distinction in the label matters because
// the two read very differently: a wide ridge here means the model's tail latency swung a lot bucket
// to bucket (e.g. degraded for an hour then recovered), not that individual requests were widely
// spread. Rendering the latter would require the backend to hand back raw samples, and doing so from
// the percentiles it actually sends would be exactly the fabrication `toLatencySeries`
// (`apps/console/src/containers/overview-usage.ts`) and ADR-0008 Decision 7's amended status note
// both rule out.
export function LatencyDashboard({
  label = 'Latency — p95 per bucket, by model',
  series,
  fallbackWidth,
  height,
  status = 'ready',
  errorMessage,
  unwiredMessage,
  onRetry,
  onSelectSeries,
  formatXTick,
  footnote,
  actions,
  className,
}: LatencyDashboardProps) {
  // Destructured at the hook call — see `SpendDashboard`'s note on `react-hooks/refs`.
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const measuredWidth = size.width || fallbackWidth;

  return (
    // The ref observes the OUTER wrapper: the chart's scroll box only exists in the chart branch,
    // so a ref mounted only there would leave the loading skeleton at `fallbackWidth` forever.
    <div ref={ref} className={className}>
      <ZoneHeading label={label} actions={actions} />
      {/* Only the CHART goes in the horizontal scroller — error and loading are prose that wraps
          to the column, and inside the scroll box they were clipped along with it. */}
      {status === 'error' ? (
        <div className="mt-4">
          <ErrorLine message={errorMessage ?? 'Failed to load latency data.'} onRetry={onRetry} />
        </div>
      ) : status === 'loading' ? (
        <div className="mt-4 flex flex-col gap-2">
          <div className="w-full overflow-x-auto overflow-y-clip">
            <LatencyChartSkeleton width={measuredWidth} height={height} />
          </div>
          <p className={LABEL_CLASS}>Querying usage…</p>
        </div>
      ) : (
        /* `tabIndex={0}` alone (no `role="region"`) -- see `LedgerTable`. `overflow-y-clip` --
           `overflow-x-auto` alone also scrolls vertically, see `SpendDashboard`. */
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
      {footnote ? <p className="text-subtle mt-2 font-mono text-[10px]">{footnote}</p> : null}
    </div>
  );
}
