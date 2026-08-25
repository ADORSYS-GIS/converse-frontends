import React from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { DonutChart } from '../../components/donut-chart';
import { ErrorLine } from '../../components/error-line';
import { DASHBOARD_LABEL } from '../dashboard-label';
import type { SpendShareSectionProps } from './types';

const RING_THICKNESS_RATIO = 0.38;
const OUTER_INSET = 4;

// Matches `DonutChart`'s own empty-state ring geometry exactly (same insets/ratio), per the
// console-ui skill's loading rule: `raised` blocks over the exact final geometry, no shimmer, no
// spinner. Documented inline rather than exported from `donut-chart` because -- same as
// `SpendDashboard`'s `SpendChartSkeleton` -- a chart-loading skeleton is the consumer's frame to
// swap out once the query resolves, not a prop on the chart primitive itself.
function DonutSkeleton({ size }: { size: number }) {
  const radius = size / 2;
  const outerRadius = Math.max(radius - OUTER_INSET, 0);
  const innerRadius = outerRadius * (1 - RING_THICKNESS_RATIO);
  return (
    <svg width={size} height={size} role="presentation" aria-hidden="true">
      <circle
        cx={radius}
        cy={radius}
        r={(outerRadius + innerRadius) / 2}
        fill="none"
        stroke={SPEC_GRID}
        strokeWidth={outerRadius - innerRadius}
      />
    </svg>
  );
}

// Contract: owner brief 2026-08-24 -- "SPEND — SHARE BY PROJECT," a donut of the same per-project
// series data `SpendDashboard`'s time series plots, placed directly below it (see this section's
// `component.stories.tsx` for the full placement note). Follows `SpendDashboard`'s own
// heading/status-row shape (`DASHBOARD_LABEL` + `ready`/`loading`/`error`) so the two dashboards
// read as one family, uncontained on the floor.
export function SpendShareSection({
  label = 'SPEND — SHARE BY PROJECT',
  slices,
  size = 200,
  status = 'ready',
  errorMessage,
  onRetry,
  selectedKey,
  onSelectSlice,
  centreMetric,
  centreLabel,
  formatTooltipValue,
  formatLegendValue,
  className,
}: SpendShareSectionProps) {
  return (
    <div className={className}>
      <div className={DASHBOARD_LABEL}>{label}</div>
      <div className="mt-4 flex justify-center">
        {status === 'error' ? (
          <ErrorLine message={errorMessage ?? 'Failed to load spend share.'} onRetry={onRetry} />
        ) : status === 'loading' ? (
          <div className="flex flex-col items-center gap-2">
            <DonutSkeleton size={size} />
            <p className="text-subtle font-mono text-[10px]">Querying usage…</p>
          </div>
        ) : (
          <DonutChart
            slices={slices}
            width={size}
            height={size}
            selectedKey={selectedKey}
            onSelectSlice={onSelectSlice}
            centreMetric={centreMetric}
            centreLabel={centreLabel}
            formatTooltipValue={formatTooltipValue}
            formatLegendValue={formatLegendValue}
          />
        )}
      </div>
    </div>
  );
}
