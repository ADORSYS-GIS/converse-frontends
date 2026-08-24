import React, { useMemo, useState } from 'react';

import { computeHistogramBins } from '@lightbridge/ui/src/components/chart-core/bins';
import {
  DEFAULT_CHART_MARGIN,
  innerHeight,
  innerWidth,
  makeLinearScale,
} from '@lightbridge/ui/src/components/chart-core/scales';

import { ChartAxisBottom, ChartAxisLeft } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import { SPEC_TEXT_MUTED, specSeriesColor } from '../../chart-tokens';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { collectXTicks, computeXDomain, computeYDomain, layoutBars } from './layout';
import type { HistogramChartProps } from './types';

const MARGIN = DEFAULT_CHART_MARGIN;
const MIN_HIT_WIDTH = 44;
const BAR_GAP = 2;
const DEFAULT_EMPTY_MESSAGE = 'No usage in this range.';

const identityFormatNumber = (v: number) => String(Math.round(v));

/**
 * Histogram primitive -- "distribution of raw samples" (ADR-0008 dashboard 2:
 * per-model latency distribution). Generic over any numeric sample set, not
 * latency-specific. Buckets `values` with `chart-core`'s `computeHistogramBins`
 * and renders one bar per bucket, sharing the monochrome-ramp-plus-accent
 * colour rule (ADR-0008 Decision 6) with every other primitive here via
 * `chart-tokens.specSeriesColor`.
 *
 * A histogram is inherently a single series -- there is nothing else on the
 * chart to distinguish it from, so unlike `SpendSeriesChart` this renders no
 * `ChartLegend` (a legend is noise for exactly one series) and has no
 * "selected" state, only `breached`, which accents the whole distribution at
 * once.
 *
 * DOM port of `@lightbridge/ui`'s `histogram-chart` (react-native-svg ->
 * `<svg>`). Renders on a fixed `width`/`height`; the caller measures its own
 * layout and passes pixels down.
 */
export function HistogramChart({
  values,
  width,
  height,
  binCount = 10,
  formatXTick = identityFormatNumber,
  formatYTick = identityFormatNumber,
  formatTooltipValue,
  breached = false,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: HistogramChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const bins = useMemo(() => computeHistogramBins(values, binCount), [values, binCount]);

  const plotWidth = innerWidth(width, MARGIN);
  const plotHeight = innerHeight(height, MARGIN);

  const xDomain = useMemo(() => computeXDomain(bins), [bins]);
  const yDomain = useMemo(() => computeYDomain(bins), [bins]);

  const xScale = useMemo(() => makeLinearScale(xDomain, [0, plotWidth]), [xDomain, plotWidth]);
  const yScale = useMemo(() => makeLinearScale(yDomain, [plotHeight, 0]), [yDomain, plotHeight]);

  const bars = useMemo(() => layoutBars(bins, xScale, BAR_GAP), [bins, xScale]);

  const color = specSeriesColor(0, { breached });

  const xTicks: ChartTick[] = useMemo(
    () =>
      collectXTicks(bins, xScale, formatXTick).map((tick) => ({
        ...tick,
        position: MARGIN.left + tick.position,
      })),
    [bins, xScale, formatXTick],
  );

  const yTicks: ChartTick[] = useMemo(
    () =>
      yScale
        .ticks(4)
        .map((value) => ({ position: MARGIN.top + yScale(value), label: formatYTick(value) })),
    [yScale, formatYTick],
  );

  const activeBar = activeIndex !== null ? bars[activeIndex] : null;
  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeBar) return [];
    const value = formatTooltipValue
      ? formatTooltipValue(activeBar.bin)
      : formatYTick(activeBar.bin.count);
    return [{ key: 'count', label: 'count', value, color }];
  }, [activeBar, formatTooltipValue, formatYTick, color]);

  if (bins.length === 0) {
    return (
      <div style={{ width, height }}>
        <svg width={width} height={height}>
          <ChartAxisLeft x={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + plotHeight} ticks={yTicks} />
          <text
            x={MARGIN.left + plotWidth / 2}
            y={MARGIN.top + plotHeight - 8}
            fontSize={10}
            fill={SPEC_TEXT_MUTED}
            textAnchor="middle">
            {emptyMessage}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg width={width} height={height}>
        <ChartAxisLeft
          x={MARGIN.left}
          y1={MARGIN.top}
          y2={MARGIN.top + plotHeight}
          gridWidth={plotWidth}
          ticks={yTicks}
        />
        <ChartAxisBottom
          y={MARGIN.top + plotHeight}
          x1={MARGIN.left}
          x2={MARGIN.left + plotWidth}
          ticks={xTicks}
        />
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {bars.map((bar, index) => {
            const barY = yScale(bar.bin.count);
            return (
              <rect
                key={`${bar.bin.x0}-${bar.bin.x1}-${index}`}
                x={bar.x}
                y={barY}
                width={bar.width}
                height={Math.max(plotHeight - barY, 0)}
                rx={2}
                fill={color}
              />
            );
          })}
        </g>
      </svg>
      {bars.map((bar, index) => {
        const hitWidth = Math.max(bar.width, MIN_HIT_WIDTH);
        const hitLeft = MARGIN.left + bar.x + bar.width / 2 - hitWidth / 2;
        return (
          <button
            key={`${bar.bin.x0}-${bar.bin.x1}-${index}`}
            type="button"
            aria-label={`${formatXTick(bar.bin.x0)}–${formatXTick(bar.bin.x1)}`}
            onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            className="absolute cursor-pointer bg-transparent p-0"
            style={{
              left: hitLeft,
              top: MARGIN.top,
              width: hitWidth,
              height: Math.max(plotHeight, MIN_HIT_WIDTH),
            }}
          />
        );
      })}
      <ChartTooltip
        visible={activeIndex !== null}
        x={activeBar ? MARGIN.left + activeBar.x + activeBar.width / 2 : 0}
        y={MARGIN.top + 8}
        title={
          activeBar ? `${formatXTick(activeBar.bin.x0)}–${formatXTick(activeBar.bin.x1)}` : undefined
        }
        rows={tooltipRows}
        containerWidth={width}
      />
    </div>
  );
}
