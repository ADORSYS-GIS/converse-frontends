import React, { useMemo, useState } from 'react';
import { area as d3Area, curveMonotoneX, line as d3Line } from 'd3-shape';
import { scaleLog } from 'd3-scale';

import { ChartAxisBottom, ChartAxisLeft } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import {
  DEFAULT_CHART_MARGIN,
  innerHeight,
  innerWidth,
  makeLinearScale,
  makeTimeScale,
} from '@lightbridge/chart-core';
import { cn } from '../../cn';
import { SPEC_FLOOR, specSeriesColor } from '../../chart-tokens';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { ChartEmptyMessage } from '../../lib/chart-empty-message';
import { ChartHitRegion } from '../../lib/chart-hit-region';
import { useHoverActive } from '../../lib/use-hover-active';
import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import { formatUsd, formatUsdAxis } from '../../lib/money';
import { META_CLASS } from '../../lib/type-roles';
import {
  collectTimestamps,
  computeYDomain,
  logAxisTicks,
  shareOfTotal,
  transformSeries,
} from './domain';
import type { TransformedSeries } from './domain';
import type { MultiSeriesSpendChartProps, MultiSeriesSpendScale } from './types';

const MIN_HIT_WIDTH = 44;
// Wider left gutter than `SpendSeriesChart`'s 52px -- the log scale's own tick labels
// ("$0.0001") run longer than a plain dollar figure and need the room at every scale, so one
// fixed margin keeps the plot area from shifting width when a story only changes `scale`.
const MARGIN = { ...DEFAULT_CHART_MARGIN, left: 60 };
const DEFAULT_EMPTY_MESSAGE = 'No usage in this range.';

const identityFormatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

function axisCaption(scale: MultiSeriesSpendScale): string | null {
  if (scale === 'log') {
    return 'Log scale — equal steps are equal ratios, not equal dollars.';
  }
  if (scale === 'indexed') {
    return "Indexed to each series' own peak — shape only, not comparable dollar totals.";
  }
  return null;
}

function formatShare(percent: number): string {
  if (percent <= 0) return '0%';
  if (percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}

/**
 * A single time-series board with ONE LINE PER SERIES, superposed on shared axes — the owner's
 * replacement for a ranked list of per-row sparklines on the three "Spend by <dimension>" zones
 * ("I want a single board... something like 'Spend over time', but declined to all models... all
 * on the same graph"). Storybook-only design exploration: not wired into `apps/console`, and not
 * a replacement for `RankedSeriesRows` (ADR 0013 D5) until the owner approves a direction here.
 *
 * The hard problem this component exists to let the owner judge: real usage is one dominant
 * series (~100% share) beside several sub-1%-share series. On a LINEAR axis the small series
 * flatline at zero — visually true, but it throws away every question about their own shape
 * ("is the small model growing?"). `scale` offers two honest alternatives rather than one
 * dishonest fix:
 *   - `linear` (default) — raw dollars. Correct, and exactly the failure mode above.
 *   - `log` — log10 of each value. Every series stays visible at every order of magnitude; the
 *     trade is that equal SPACING now means equal RATIO, not equal dollars (stated on the axis
 *     caption, never left implicit) and a real $0 bucket cannot be placed on it (see `domain.ts`).
 *   - `indexed` — each series normalized to its OWN period max. A shape-only comparison ("did
 *     this model's usage double or halve"), explicitly NOT a magnitude comparison — the axis
 *     caption and the "% of series peak" tick label say so.
 * The legend's totals and share percentages are always the TRUE dollar figures regardless of
 * `scale` — switching the axis transform never changes what the numbers assert.
 *
 * Same visual language as `SpendSeriesChart`: DOM `<svg>`, `chart-core` math, the theme-dependent
 * monochrome rank ramp, `primary` used at most once (the hovered-or-selected series), gap-broken
 * lines (`domain.ts`'s `transformSeries`, the same non-interpolating contract
 * `spend-series-chart/domain.ts`'s `withGapSentinels` established), and a Floating UI tooltip.
 * Diverges deliberately from it in two ways this board's brief specifically asked for: a
 * rank-ordered legend with right-aligned mono totals/share (no per-row sparkline — the very thing
 * the owner rejected) that collapses its zero-spend tail, and hover-to-dim cross-highlighting
 * (`SpendSeriesChart`'s legend only supports click-to-pin).
 */
export function MultiSeriesSpendChart({
  series,
  width,
  height,
  scale = 'linear',
  formatXTick = identityFormatDate,
  formatTooltipTitle = formatXTick,
  formatValue = formatUsd,
  onSelectSeries,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  className,
}: MultiSeriesSpendChartProps) {
  // Click-pinned selection (persists) — same contract as `SpendSeriesChart.onSelectSeries`.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Hover preview (temporary, cleared on pointer/focus leave) — sanctioned local state, the same
  // class as `useHoverActive` below: purely local, gone on remount, never URL-worthy.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  // The zero-spend tail's disclosure toggle — same sanctioned exception `RankedSeriesRows` uses.
  const [zeroTailExpanded, setZeroTailExpanded] = useState(false);
  const { active: activeIndex, activeInput, getHoverProps } = useHoverActive<number>();
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const timestamps = useMemo(() => collectTimestamps(series), [series]);
  const transformed = useMemo(
    () => transformSeries(series, timestamps, scale),
    [series, timestamps, scale]
  );
  // Rank order — by TRUE total, descending — drives colour, the legend's reading order and the
  // tooltip's row order all at once, so the three never disagree about "which series is #1".
  const ranked = useMemo(
    () => [...transformed].sort((a, b) => b.total - a.total),
    [transformed]
  );
  // A series with no spend at all this period plots no line (every scale transform already gaps
  // every one of its buckets in `transformSeries` for `log`/`indexed`; `linear` is the one scale
  // where a genuine all-zero series COULD still draw a flat line at the baseline, and this drops
  // it there too — decluttering the board the same way its legend row collapses into the
  // zero-spend tail, rather than one surface hiding it and the other not).
  const withSpend = useMemo(() => ranked.filter((s) => s.total > 0), [ranked]);
  const noSpend = useMemo(() => ranked.filter((s) => s.total <= 0), [ranked]);
  const grandTotal = useMemo(
    () => withSpend.reduce((sum, s) => sum + Math.max(s.total, 0), 0),
    [withSpend]
  );

  const emphasizedKey = hoveredKey ?? selectedKey;

  const yDomain = useMemo(() => computeYDomain(withSpend, scale), [withSpend, scale]);
  const plotWidth = innerWidth(width, MARGIN);
  const plotHeight = innerHeight(height, MARGIN);

  const xScale = useMemo(
    () =>
      timestamps.length > 0
        ? makeTimeScale([timestamps[0], timestamps[timestamps.length - 1]], [0, plotWidth])
        : null,
    [timestamps, plotWidth]
  );
  const yScale = useMemo(() => {
    if (scale === 'log') {
      return scaleLog<number, number>().domain(yDomain).range([plotHeight, 0]);
    }
    return makeLinearScale(yDomain, [plotHeight, 0]);
  }, [scale, yDomain, plotHeight]);

  function handleSelect(key: string | null) {
    setSelectedKey(key);
    onSelectSeries?.(key);
  }

  const xTicks: ChartTick[] = useMemo(() => {
    const step = Math.max(1, Math.ceil(timestamps.length / 6));
    return timestamps
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        position: MARGIN.left + (xScale?.(d) ?? 0),
        label: formatXTick(d),
      }));
  }, [timestamps, xScale, formatXTick]);

  const yTicks: ChartTick[] = useMemo(() => {
    if (scale === 'indexed') {
      return [0, 25, 50, 75, 100].map((value) => ({
        position: MARGIN.top + yScale(value),
        label: `${value}%`,
      }));
    }
    if (scale === 'log') {
      return logAxisTicks(yDomain).map((value) => ({
        position: MARGIN.top + yScale(value),
        label: formatUsdAxis(value),
      }));
    }
    return yScale
      .ticks(4)
      .map((value) => ({ position: MARGIN.top + yScale(value), label: formatUsdAxis(value) }));
  }, [scale, yDomain, yScale]);

  const activeTimestamp = activeIndex !== null ? timestamps[activeIndex] : null;
  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeTimestamp) return [];
    const time = activeTimestamp.getTime();
    return withSpend
      .map((s, index): ChartTooltipRow | null => {
        // The tooltip states the RAW figure, never the scale-transformed one — a log/indexed axis
        // changes how a value is PLOTTED, never what it is worth.
        const rawSeries = series.find((raw) => raw.key === s.key);
        const rawPoint = rawSeries?.points.find((p) => p.x.getTime() === time);
        if (!rawPoint) return null;
        return {
          key: s.key,
          label: s.label,
          value: formatValue(rawPoint.y),
          color: specSeriesColor(index, {
            selected: s.key === emphasizedKey,
            breached: s.breached,
          }),
        };
      })
      .filter((row): row is ChartTooltipRow => row !== null);
  }, [activeTimestamp, withSpend, series, emphasizedKey, formatValue]);

  const pinnedPoint = useMemo(() => {
    if (!activeTimestamp) return null;
    const x = MARGIN.left + (xScale?.(activeTimestamp) ?? 0);
    const firstPoint = withSpend[0]?.points.find(
      (p) => p.x.getTime() === activeTimestamp.getTime() && Number.isFinite(p.y)
    );
    const y = MARGIN.top + (firstPoint ? yScale(firstPoint.y) : 0);
    return { x, y };
  }, [activeTimestamp, xScale, withSpend, yScale]);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({
      open: activeIndex !== null && svgElement !== null,
      anchorElement: svgElement,
      pinnedPoint: activeInput === 'hover' ? null : pinnedPoint,
    });

  const caption = axisCaption(scale);

  if (series.length === 0 || timestamps.length === 0) {
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
        <ChartEmptyMessage left={MARGIN.left} right={MARGIN.right} top={MARGIN.top + plotHeight / 2}>
          {emptyMessage}
        </ChartEmptyMessage>
      </div>
    );
  }

  return (
    <div className={className} style={{ width }}>
      {caption ? <p className={cn(META_CLASS, 'mb-2')}>{caption}</p> : null}
      <div style={{ width, height, position: 'relative' }}>
        <svg ref={setSvgElement} width={width} height={height}>
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
            {withSpend.map((s: TransformedSeries, index) => {
              const selected = s.key === selectedKey;
              const emphasized = s.key === emphasizedKey;
              const dim = emphasizedKey !== null && !emphasized && !s.breached;
              const color = specSeriesColor(index, { selected: emphasized, breached: s.breached });
              const defined = s.points.filter((p) => Number.isFinite(p.y));
              const lineGen = d3Line<(typeof s.points)[number]>()
                .defined((p) => Number.isFinite(p.y))
                .x((p) => xScale?.(p.x) ?? 0)
                .y((p) => yScale(p.y))
                .curve(curveMonotoneX);
              const areaGen = d3Area<(typeof s.points)[number]>()
                .defined((p) => Number.isFinite(p.y))
                .x((p) => xScale?.(p.x) ?? 0)
                .y0(yScale.range()[0])
                .y1((p) => yScale(p.y))
                .curve(curveMonotoneX);
              const d = lineGen(s.points) ?? undefined;
              return (
                <g key={s.key} style={{ opacity: dim ? 0.35 : 1 }}>
                  {selected && defined.length > 1 ? (
                    <path d={areaGen(s.points) ?? undefined} fill={color} fillOpacity={0.1} />
                  ) : null}
                  {defined.length > 1 ? (
                    <path
                      d={d}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : null}
                  {defined.map((p) => (
                    <circle
                      key={p.x.toISOString()}
                      cx={xScale?.(p.x) ?? 0}
                      cy={yScale(p.y)}
                      r={defined.length === 1 ? 5 : 3.5}
                      fill={color}
                      stroke={SPEC_FLOOR}
                      strokeWidth={2}
                    />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>
        {timestamps.map((d, index) => {
          const rawX = xScale?.(d) ?? 0;
          const hitWidth = Math.max(plotWidth / Math.max(timestamps.length, 1), MIN_HIT_WIDTH / 2);
          return (
            <ChartHitRegion
              key={d.toISOString()}
              aria-label={formatTooltipTitle(d)}
              {...getReferenceProps(getHoverProps(index))}
              style={{
                left: MARGIN.left + rawX - hitWidth / 2,
                top: MARGIN.top,
                width: hitWidth,
                height: Math.max(plotHeight, MIN_HIT_WIDTH),
              }}
            />
          );
        })}
        <ChartTooltip
          visible={activeIndex !== null}
          title={activeTimestamp ? formatTooltipTitle(activeTimestamp) : undefined}
          rows={tooltipRows}
          setFloating={setFloating}
          floatingStyles={floatingStyles}
          getFloatingProps={getFloatingProps}
        />
      </div>
      <div className="multi-series-legend mt-2">
        {withSpend.map((s, index) => {
          const emphasized = s.key === emphasizedKey || Boolean(s.breached);
          // The chart's own lines dim a non-emphasized series via inline `opacity` (see the `<g>`
          // above) whenever something else is hovered/selected — the legend row for that same
          // series dims the same way, via the shared `data-dim` hook, so "others dim" reads
          // identically in both halves of the board.
          const dim = emphasizedKey !== null && !emphasized;
          const color = specSeriesColor(index, {
            selected: s.key === emphasizedKey,
            breached: s.breached,
          });
          const percent = shareOfTotal(s.total, grandTotal);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => handleSelect(s.key === selectedKey ? null : s.key)}
              onMouseEnter={() => setHoveredKey(s.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onFocus={() => setHoveredKey(s.key)}
              onBlur={() => setHoveredKey(null)}
              aria-pressed={s.key === selectedKey}
              data-emphasized={emphasized ? 'true' : 'false'}
              data-dim={dim ? 'true' : 'false'}
              className="multi-series-legend-row">
              <span aria-hidden="true" className="series-swatch" style={{ backgroundColor: color }} />
              <span className="multi-series-legend-label">{s.label}</span>
              <span className="multi-series-legend-value">{formatValue(s.total)}</span>
              <span className="multi-series-legend-percent">{formatShare(percent)}</span>
            </button>
          );
        })}

        {noSpend.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setZeroTailExpanded((expanded) => !expanded)}
              aria-expanded={zeroTailExpanded}
              data-emphasized="false"
              data-dim="true"
              className="multi-series-legend-row">
              <span aria-hidden="true" className="series-swatch" style={{ backgroundColor: 'transparent' }} />
              <span className="multi-series-legend-label">
                {noSpend.length} more · no spend this period
              </span>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            {zeroTailExpanded ? (
              <div className="multi-series-legend">
                {noSpend.map((s) => (
                  <div
                    key={s.key}
                    data-emphasized="false"
                    data-dim="true"
                    className="multi-series-legend-row">
                    <span aria-hidden="true" className="series-swatch" style={{ backgroundColor: 'transparent' }} />
                    <span className="multi-series-legend-label">{s.label}</span>
                    <span className="multi-series-legend-value">{formatValue(0)}</span>
                    <span aria-hidden="true" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
