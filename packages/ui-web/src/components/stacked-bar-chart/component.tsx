import React, { useMemo, useState } from 'react';

import {
  computeStackLayout,
  DEFAULT_CHART_MARGIN,
  innerHeight,
  innerWidth,
  makeBandScale,
  makeLinearScale,
  stackDominanceCaption,
  STACK_OTHER_KEY,
} from '@lightbridge/chart-core';
import type { StackLayout } from '@lightbridge/chart-core';

import { ChartAxisBottom, ChartAxisLeft } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import { cn } from '../../cn';
import { SPEC_FLOOR, SPEC_TEXT_MUTED, specSeriesColor } from '../../chart-tokens';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { ChartEmptyMessage } from '../../lib/chart-empty-message';
import { ChartHitRegion } from '../../lib/chart-hit-region';
import { useHoverActive } from '../../lib/use-hover-active';
import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import { formatUsd, formatUsdAxis } from '../../lib/money';
import { META_CLASS } from '../../lib/type-roles';
import { buildSummaryCaption } from '../multi-series-spend-chart';
import type { StackedBarChartProps, StackedBarSeries } from './types';

const MARGIN = { ...DEFAULT_CHART_MARGIN, left: 60 };
const DEFAULT_EMPTY_MESSAGE = 'No usage in this range.';
const DEFAULT_TOP_N = 6;
/** A bar narrower than this is a hairline nobody can aim at, so the plot scrolls its parent
 *  rather than shrinking further — see `bandWidth` below. */
const MIN_BAND_STEP = 6;

const identityFormatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

/**
 * The dominance caveat this board prints above itself, for a caller that has to state it
 * somewhere else — exported for exactly the reason `scaleAxisCaption` is: `static` mode drops
 * every DOM caption, and the Typst report has to carry the same sentence in its own chrome. A
 * one-model-at-99% stack in a PDF with no note is exactly as misleading as one on screen.
 *
 * Takes the same `series`/`topN` the chart does, so the caller cannot compute the caveat against a
 * different collapse than the one that was drawn.
 */
export function stackedBarCaption(
  series: readonly StackedBarSeries[],
  topN: number = DEFAULT_TOP_N
): string | null {
  return stackDominanceCaption(computeStackLayout(series, { topN }));
}

function formatShare(percent: number): string {
  if (percent <= 0) return '0%';
  if (percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}

/**
 * Daily spend × model as a STACKED BAR board — one bar per time bucket, one segment per model,
 * ordered by period total with the tail folded into `Other (N)`.
 *
 * **This mark is a deliberate, recorded exception.** ADR 0013 D5 banned stacked bars on measured
 * grounds (segments past the first share no baseline, so their lengths are the second-worst
 * channel a reader has), and ADR 0015 D5 restated the ban. The owner overruled it on 2026-09-03
 * for exactly one question — daily spend by model — where the reader's first question is "what did
 * we spend that day" (the total, which a stack states as bar height and a superposed line chart
 * cannot state at all) and the split is the second question. The caveat was NOT retracted, so it
 * travels with the mark: `stackDominanceCaption` prints it above the board whenever the top series
 * is over 95% of the period, which is the case the ban was measured on.
 *
 * Everything else follows the same doctrine as every other chart here:
 *  - **No legend list** (owner ruling, 2026-08-31). Every segment's label, true value and share
 *    live in the Floating-UI `ChartTooltip`, which lists EVERY segment of the hovered bucket
 *    top-to-bottom in rank order alongside that bucket's total.
 *  - **Monochrome rank ramp, accent for one series at most** — the hovered or pinned one
 *    (`specSeriesColor`), never a hue per model.
 *  - **Keyboard-reachable values.** The per-bucket hit regions are real `<button>`s, so Tab walks
 *    the buckets and each stop opens the same tooltip a pointer would. The segment rects
 *    themselves are pointer affordances only (hover to emphasise, click to pin): making every
 *    segment its own tab stop would put `buckets × models` stops between a keyboard user and the
 *    next control, for a selection that only re-colours a mark whose values the bucket stop
 *    already read out.
 */
export function StackedBarChart({
  series,
  width,
  height,
  topN = DEFAULT_TOP_N,
  otherLabel,
  formatXTick = identityFormatDate,
  formatTooltipTitle = formatXTick,
  formatValue = formatUsd,
  formatYTick = formatUsdAxis,
  onSelectSeries,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  truncationCaption,
  static: isStatic = false,
  className,
}: StackedBarChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const { active: activeIndex, activeInput, getHoverProps } = useHoverActive<number>();
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const layout: StackLayout = useMemo(
    () => computeStackLayout(series, { topN, otherLabel }),
    [series, topN, otherLabel]
  );

  const plotWidth = innerWidth(width, MARGIN);
  const plotHeight = innerHeight(height, MARGIN);

  const xScale = useMemo(
    () =>
      makeBandScale(
        layout.buckets.map((bucket) => bucket.x.toISOString()),
        [0, plotWidth],
        { paddingInner: 0.2, paddingOuter: 0.1 }
      ),
    [layout.buckets, plotWidth]
  );
  const yScale = useMemo(
    () => makeLinearScale([0, layout.maxTotal], [plotHeight, 0]),
    [layout.maxTotal, plotHeight]
  );

  const bandWidth = Math.max(xScale.bandwidth(), MIN_BAND_STEP);
  const emphasizedKey = hoveredKey ?? selectedKey;

  const xTicks: ChartTick[] = useMemo(() => {
    const step = Math.max(1, Math.ceil(layout.buckets.length / 6));
    return layout.buckets
      .filter((_, index) => index % step === 0)
      .map((bucket) => ({
        position: MARGIN.left + (xScale(bucket.x.toISOString()) ?? 0) + bandWidth / 2,
        label: formatXTick(bucket.x),
      }));
  }, [layout.buckets, xScale, bandWidth, formatXTick]);

  const yTicks: ChartTick[] = useMemo(
    () =>
      yScale
        .ticks(4)
        .map((value) => ({ position: MARGIN.top + yScale(value), label: formatYTick(value) })),
    [yScale, formatYTick]
  );

  const activeBucket = activeIndex !== null ? (layout.buckets[activeIndex] ?? null) : null;

  /**
   * Every segment of the hovered bucket, plus that bucket's own total as the first row — the two
   * readings a stack is for. Rank order, so the rows run top-to-bottom in the same order the
   * segments run bottom-to-top, and each carries the TRUE value and this bucket's share.
   */
  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeBucket) return [];
    const total = activeBucket.total;
    const rows: ChartTooltipRow[] = [
      { key: '__total__', label: 'Total', value: formatValue(total) },
    ];
    for (const segment of activeBucket.segments) {
      rows.push({
        key: segment.key,
        label: segment.label,
        value: `${formatValue(segment.value)} · ${formatShare(total > 0 ? (segment.value / total) * 100 : 0)}`,
        color: specSeriesColor(segment.index, { selected: segment.key === emphasizedKey }),
      });
    }
    return rows;
  }, [activeBucket, formatValue, emphasizedKey]);

  const pinnedPoint = useMemo(() => {
    if (!activeBucket) return null;
    return {
      x: MARGIN.left + (xScale(activeBucket.x.toISOString()) ?? 0) + bandWidth / 2,
      y: MARGIN.top + yScale(activeBucket.total),
    };
  }, [activeBucket, xScale, bandWidth, yScale]);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({
      open: !isStatic && activeIndex !== null && svgElement !== null,
      anchorElement: svgElement,
      pinnedPoint: activeInput === 'hover' ? null : pinnedPoint,
    });

  function handleSelect(key: string | null) {
    // The folded tail is not a series — pinning "Other (3)" would accent three unrelated models.
    const next = key === STACK_OTHER_KEY ? null : key;
    setSelectedKey(next);
    onSelectSeries?.(next);
  }

  const dominanceCaption = stackDominanceCaption(layout);
  // A series with no spend at all this period contributes no segment to any bar — counted in the
  // caption rather than drawn, the same way the line board collapses its zero-spend tail.
  const noSpendCount = useMemo(
    () => series.filter((s) => s.points.every((point) => !(point.y > 0))).length,
    [series]
  );
  const summaryCaption = buildSummaryCaption(
    layout.grandTotal,
    series.length,
    noSpendCount,
    formatValue,
    truncationCaption
  );

  /** Axes plus one `<g>` per bucket — the picture, drawn identically on screen and on paper. */
  const plotBody = (
    <>
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
        {layout.buckets.map((bucket) => {
          const x = xScale(bucket.x.toISOString()) ?? 0;
          return (
            <g key={bucket.x.toISOString()}>
              {/* A hairline in the FLOOR colour at each internal boundary, drawn on top of the
                  rects rather than as a stroke around them. It is not decoration: the rank ramp is
                  four steps and clamps past rank 3 (`specSeriesColor`), so a stack of six segments
                  has three adjacent identical fills that would otherwise merge into one block. A
                  stroke on the rect itself would eat half a pixel off each edge, which on a 2px
                  sliver is a visible distortion of a value; a separator line changes no height. */}
              {bucket.segments.map((segment) => {
                const emphasized = segment.key === emphasizedKey;
                const dim = emphasizedKey !== null && !emphasized;
                const y = yScale(segment.y1);
                const barHeight = Math.max(yScale(segment.y0) - y, 0);
                return (
                  <rect
                    key={segment.key}
                    x={x}
                    y={y}
                    width={bandWidth}
                    height={barHeight}
                    fill={specSeriesColor(segment.index, { selected: emphasized })}
                    opacity={dim ? 0.4 : 1}
                    shapeRendering="crispEdges"
                    style={isStatic ? undefined : { cursor: 'pointer' }}
                    onMouseEnter={isStatic ? undefined : () => setHoveredKey(segment.key)}
                    onMouseLeave={isStatic ? undefined : () => setHoveredKey(null)}
                    onClick={
                      isStatic
                        ? undefined
                        : () => handleSelect(segment.key === selectedKey ? null : segment.key)
                    }
                  />
                );
              })}
              {bucket.segments.slice(0, -1).map((segment) => (
                <line
                  key={`sep-${segment.key}`}
                  x1={x}
                  x2={x + bandWidth}
                  y1={yScale(segment.y1)}
                  y2={yScale(segment.y1)}
                  stroke={SPEC_FLOOR}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                  pointerEvents="none"
                />
              ))}
            </g>
          );
        })}
      </g>
    </>
  );

  const empty = layout.buckets.length === 0;

  // ── `static`: a STANDALONE `<svg>` document, and nothing else ────────────────────────────────
  if (isStatic) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}>
        {empty ? (
          <>
            <ChartAxisLeft
              x={MARGIN.left}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              ticks={yTicks}
            />
            <text
              x={MARGIN.left + plotWidth / 2}
              y={MARGIN.top + plotHeight / 2}
              fontSize={11}
              fill={SPEC_TEXT_MUTED}
              textAnchor="middle">
              {emptyMessage}
            </text>
          </>
        ) : (
          plotBody
        )}
      </svg>
    );
  }

  if (empty) {
    return (
      <div className={className} style={{ width, height, position: 'relative' }}>
        <svg width={width} height={height}>
          <ChartAxisLeft
            x={MARGIN.left}
            y1={MARGIN.top}
            y2={MARGIN.top + plotHeight}
            ticks={yTicks}
          />
        </svg>
        <ChartEmptyMessage
          left={MARGIN.left}
          right={MARGIN.right}
          top={MARGIN.top + plotHeight / 2}>
          {emptyMessage}
        </ChartEmptyMessage>
      </div>
    );
  }

  return (
    <div className={className} style={{ width }}>
      {dominanceCaption ? <p className={cn(META_CLASS, 'mb-2')}>{dominanceCaption}</p> : null}
      <div style={{ width, height, position: 'relative' }}>
        <svg ref={setSvgElement} width={width} height={height}>
          {plotBody}
        </svg>
        {layout.buckets.map((bucket, index) => {
          const x = xScale(bucket.x.toISOString()) ?? 0;
          const step = xScale.step() || bandWidth;
          return (
            <ChartHitRegion
              key={bucket.x.toISOString()}
              aria-label={`${formatTooltipTitle(bucket.x)}, ${formatValue(bucket.total)}`}
              {...getReferenceProps(getHoverProps(index))}
              style={{
                left: MARGIN.left + x + bandWidth / 2 - step / 2,
                top: MARGIN.top,
                width: step,
                height: plotHeight,
              }}
            />
          );
        })}
        <ChartTooltip
          visible={activeIndex !== null}
          title={activeBucket ? formatTooltipTitle(activeBucket.x) : undefined}
          rows={tooltipRows}
          setFloating={setFloating}
          floatingStyles={floatingStyles}
          getFloatingProps={getFloatingProps}
        />
      </div>
      {summaryCaption ? <p className={cn(META_CLASS, 'mt-2')}>{summaryCaption}</p> : null}
    </div>
  );
}
