import React from 'react';

import { MultiSeriesSpendChart } from '../../components/multi-series-spend-chart';
import { ErrorLine } from '../../components/error-line';
import { SegmentedControl } from '../../components/segmented-control';
import type { SegmentedOption } from '../../components/segmented-control';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { ZoneHeading } from '../../lib/zone-heading';
import type { MultiSeriesSpendScale } from '../../components/multi-series-spend-chart';
import type { MultiSeriesSpendBoardProps } from './types';

const SCALE_OPTIONS: SegmentedOption<MultiSeriesSpendScale>[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'log', label: 'Log' },
  { value: 'indexed', label: 'Indexed' },
];

/**
 * The zone-level wrapper `MultiSeriesSpendChart`'s two real callers share — `/` "Spend by model"
 * (`OverviewCentre`) and `/settings/overview/usage` "Spend by account" (`UsageOverviewCentre`),
 * wired 2026-08-31 in place of the `RankedSeriesRows` board each used to render (owner ruling —
 * see `multi-series-spend-chart/component.tsx`'s own doc comment). Same shape `SpendDashboard`
 * already established for `SpendSeriesChart`: `ZoneHeading` (label + the heading-row actions
 * cluster) above a fluid-width chart that measures its own container (`useResizeObserver`) rather
 * than being forced to a fixed pixel width, plus the same error/loading status branching.
 *
 * The ONE thing this zone's heading always carries is the scale toggle — `linear`/`log`/`indexed`
 * (`MultiSeriesSpendChart`'s own `scale` prop), the same `SegmentedControl` idiom the estate
 * overview's account sort toggle and the range picker's own preset row already use. `scale` is
 * controlled from outside (a URL-first `apps/console` hook, per the console-ui skill's "view
 * state lives in the URL") — this section owns no state of its own.
 */
export function MultiSeriesSpendBoard({
  label = 'Spend',
  series,
  scale,
  onScaleChange,
  fallbackWidth,
  height,
  status = 'ready',
  errorMessage,
  onRetry,
  onSelectSeries,
  formatXTick,
  formatTooltipTitle,
  formatValue,
  formatYTick,
  emptyMessage,
  truncationCaption,
  className,
}: MultiSeriesSpendBoardProps) {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const measuredWidth = size.width || fallbackWidth;

  return (
    <div className={className}>
      <ZoneHeading
        label={label}
        actions={
          <SegmentedControl
            aria-label="Scale"
            options={SCALE_OPTIONS}
            value={scale}
            onChange={onScaleChange}
          />
        }
      />
      <div ref={ref} className="mt-4 w-full">
        {status === 'error' ? (
          <ErrorLine message={errorMessage ?? 'Failed to load spend data.'} onRetry={onRetry} />
        ) : status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton" style={{ width: measuredWidth, height }} />
            <p className="text-subtle font-sans text-[10px]">Querying usage…</p>
          </div>
        ) : (
          <MultiSeriesSpendChart
            series={series}
            width={measuredWidth}
            height={height}
            scale={scale}
            formatXTick={formatXTick}
            formatTooltipTitle={formatTooltipTitle}
            formatValue={formatValue}
            formatYTick={formatYTick}
            onSelectSeries={onSelectSeries}
            emptyMessage={emptyMessage}
            truncationCaption={truncationCaption}
          />
        )}
      </div>
    </div>
  );
}
