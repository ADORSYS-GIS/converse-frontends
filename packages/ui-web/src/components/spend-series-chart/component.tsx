import React, { useMemo, useState } from 'react';
import { area as d3Area, curveMonotoneX, line as d3Line } from 'd3-shape';

import { ChartAxisBottom, ChartAxisLeft } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import {
  DEFAULT_CHART_MARGIN,
  innerHeight,
  innerWidth,
  makeBandScale,
  makeLinearScale,
  makeTimeScale,
} from '@lightbridge/chart-core';
import { SPEC_BASELINE, SPEC_FLOOR, seriesDash, specSeriesColor } from '../../chart-tokens';
import { ChartLegend } from '../chart-legend';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { ChartEmptyMessage } from '../../lib/chart-empty-message';
import { ChartHitRegion } from '../../lib/chart-hit-region';
import { useHoverActive } from '../../lib/use-hover-active';
import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import { collectTimestamps, collectYDomain, cumulateSeries, withGapSentinels } from './domain';
import type { SpendSeriesChartProps, SpendSeriesSeries } from './types';

const MIN_HIT_WIDTH = 44;
const MARGIN = { ...DEFAULT_CHART_MARGIN, left: 52 };
const DEFAULT_EMPTY_MESSAGE = 'No usage in this range.';

const identityFormatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const identityFormatNumber = (v: number) => String(Math.round(v));

/**
 * Time-series / bar primitive -- "spend over time" (ADR-0008 dashboard 1).
 * `variant="line"` overlays one line per series; `variant="bars"` draws
 * grouped columns per timestamp. Both share the spec's monochrome-ramp +
 * accent-on-selection colour rule (ADR-0008 Decision 6) via
 * `chart-tokens.specSeriesColor`, and both render uncontained on the caller's
 * `#000` floor (Decision 3).
 *
 * DOM port of packages/ui's `time-series-chart`, renamed to
 * `SpendSeriesChart` per the console-redesign spec's §4 component inventory
 * (`react-native-svg` -> `<svg>`, `Pressable`/`View` -> `<button>`/`<div>`).
 * Renders on a fixed `width`/`height` (an `<svg>` has no intrinsic size); the
 * caller measures its own layout and passes pixels down.
 */
export function SpendSeriesChart({
  series,
  width,
  height,
  variant = 'line',
  formatXTick = identityFormatDate,
  formatYTick = identityFormatNumber,
  formatTooltipValue = identityFormatNumber,
  formatTooltipTitle = formatXTick,
  formatLegendValue,
  onSelectSeries,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  cumulative = false,
  ceiling,
}: SpendSeriesChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Which timestamp index the tooltip is anchored to -- hover/focus-driven (`useHoverActive`),
  // independent of `selectedKey` (legend-click-driven). See that hook's own docstring for why
  // hover, not just click, now drives this.
  const { active: activeIndex, activeInput, getHoverProps } = useHoverActive<number>();
  // The tooltip's Floating UI virtual element needs a real `contextElement` --
  // state, not a plain ref, so the tooltip re-renders once the `<svg>` mounts.
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const timestamps = useMemo(() => collectTimestamps(series), [series]);

  // `cumulative` runs each series to a running total over the FULL timestamp domain before
  // anything downstream (the y-domain, the line/area path, the tooltip, the legend) ever sees it
  // -- see `domain.ts`'s own doc comment for why a burn-down forward-fills instead of gapping.
  const cumulatedSeries = useMemo(
    () => (cumulative ? cumulateSeries(series, timestamps) : series),
    [cumulative, series, timestamps]
  );

  // A ceiling breach reuses the SAME accent `series[].breached` already drives everywhere else in
  // this component, rather than a second colour rule for this one case -- a series' last plotted
  // value (its final running total, in cumulative mode) at or past `ceiling` is a breach.
  const renderSeries = useMemo<SpendSeriesSeries[]>(() => {
    if (ceiling === undefined) return cumulatedSeries;
    return cumulatedSeries.map((s) => {
      const last = s.points[s.points.length - 1];
      const breached = s.breached || (last !== undefined && last.y >= ceiling);
      return breached === s.breached ? s : { ...s, breached };
    });
  }, [cumulatedSeries, ceiling]);

  const yDomain = useMemo((): [number, number] => {
    const [lo, hi] = collectYDomain(renderSeries);
    return ceiling !== undefined ? [lo, Math.max(hi, ceiling)] : [lo, hi];
  }, [renderSeries, ceiling]);

  const plotWidth = innerWidth(width, MARGIN);
  const plotHeight = innerHeight(height, MARGIN);

  const xScale = useMemo(
    () =>
      timestamps.length > 0
        ? makeTimeScale([timestamps[0], timestamps[timestamps.length - 1]], [0, plotWidth])
        : null,
    [timestamps, plotWidth]
  );
  const bandScale = useMemo(
    () =>
      makeBandScale(
        timestamps.map((d) => d.toISOString()),
        [0, plotWidth]
      ),
    [timestamps, plotWidth]
  );
  const yScale = useMemo(() => makeLinearScale(yDomain, [plotHeight, 0]), [yDomain, plotHeight]);

  function handleSelect(key: string | null) {
    setSelectedKey(key);
    onSelectSeries?.(key);
  }

  const xTicks: ChartTick[] = useMemo(() => {
    const step = Math.max(1, Math.ceil(timestamps.length / 6));
    return timestamps
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        position:
          MARGIN.left +
          (variant === 'bars'
            ? (bandScale(d.toISOString()) ?? 0) + bandScale.bandwidth() / 2
            : (xScale?.(d) ?? 0)),
        label: formatXTick(d),
      }));
  }, [timestamps, variant, bandScale, xScale, formatXTick]);

  const yTicks: ChartTick[] = useMemo(() => {
    return yScale
      .ticks(4)
      .map((value) => ({ position: MARGIN.top + yScale(value), label: formatYTick(value) }));
  }, [yScale, formatYTick]);

  const activeTimestamp = activeIndex !== null ? timestamps[activeIndex] : null;
  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeTimestamp) return [];
    return renderSeries
      .map((s, index): ChartTooltipRow | null => {
        const point = s.points.find((p) => p.x.getTime() === activeTimestamp.getTime());
        if (!point) return null;
        return {
          key: s.key,
          label: s.label,
          value: formatTooltipValue(point.y),
          color: specSeriesColor(index, { selected: s.key === selectedKey, breached: s.breached }),
        };
      })
      .filter((row): row is ChartTooltipRow => row !== null);
  }, [activeTimestamp, renderSeries, selectedKey, formatTooltipValue]);

  // The tooltip's frozen fallback point for touch/keyboard activation -- the active timestamp's
  // own plotted x, and the first series' plotted y at that timestamp (falling back to the plot's
  // top edge when no series has a point there). Unused while a live pointer drives `activeInput`
  // ('hover'): `useChartTooltipFloating` lets `useClientPoint` track the real cursor instead.
  const pinnedPoint = useMemo(() => {
    if (!activeTimestamp) return null;
    const x =
      MARGIN.left +
      (variant === 'bars'
        ? (bandScale(activeTimestamp.toISOString()) ?? 0) + bandScale.bandwidth() / 2
        : (xScale?.(activeTimestamp) ?? 0));
    const firstPoint = renderSeries[0]?.points.find(
      (p) => p.x.getTime() === activeTimestamp.getTime()
    );
    const y = MARGIN.top + (firstPoint ? yScale(firstPoint.y) : 0);
    return { x, y };
  }, [activeTimestamp, variant, bandScale, xScale, renderSeries, yScale]);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({
      open: activeIndex !== null && svgElement !== null,
      anchorElement: svgElement,
      pinnedPoint: activeInput === 'hover' ? null : pinnedPoint,
    });

  const legendItems = useMemo(
    () =>
      renderSeries.map((s) => ({
        key: s.key,
        label: s.label,
        value: formatLegendValue?.(s),
        breached: s.breached,
      })),
    [renderSeries, formatLegendValue]
  );

  if (series.length === 0 || timestamps.length === 0) {
    return (
      <div style={{ width, height, position: 'relative' }}>
        <svg width={width} height={height}>
          <ChartAxisLeft
            x={MARGIN.left}
            y1={MARGIN.top}
            y2={MARGIN.top + plotHeight}
            ticks={yTicks}
          />
        </svg>
        {/* DOM text, never an SVG `<text>` — see `ChartEmptyMessage` for the bug that settled
            that, and for why the copy is inset to the plot rather than centred on it. */}
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
    // Outer wrapper is auto-height: the plot box below is pinned to the caller's `height`, but the
    // legend is a normal-flow sibling AFTER it, not a child squeezed inside it (phase 9 nit —
    // owner screenshot: the legend row sat at/over the Card's bottom padding). A `<div
    // style={{ height }}>` clips nothing itself (default `overflow: visible`), so a legend nested
    // INSIDE that fixed-height box paints past its bottom edge while the box's own layout size
    // stays exactly `height` — which is what let the legend overlap the Card's padding instead of
    // pushing it. Moving the legend outside the fixed-height box makes its real rendered height
    // part of this wrapper's normal flow, so the Card sizes around it correctly.
    <div style={{ width }}>
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
            {variant === 'line'
              ? renderSeries.map((s, index) => {
                  const selected = s.key === selectedKey;
                  const color = specSeriesColor(index, { selected, breached: s.breached });
                  // The actual points this series reports (no gap sentinels) — what the circle
                  // markers draw, unchanged from before this fix: a marker only where there is
                  // real data.
                  const sorted = [...s.points].sort((a, b) => a.x.getTime() - b.x.getTime());
                  // The FULL timestamp domain, `NaN` standing in for a bucket this series has no
                  // point for — what the line/area path draws. `.defined()` breaks the generated
                  // path at every `NaN`, so the line stops drawing spend across days the series
                  // never reported on (build brief §2a) instead of connecting straight across
                  // them the way plotting `sorted` alone would.
                  const withGaps = withGapSentinels(s, timestamps);
                  const lineGen = d3Line<(typeof withGaps)[number]>()
                    .defined((p) => Number.isFinite(p.y))
                    .x((p) => xScale?.(p.x) ?? 0)
                    .y((p) => yScale(p.y))
                    .curve(curveMonotoneX);
                  const areaGen = d3Area<(typeof withGaps)[number]>()
                    .defined((p) => Number.isFinite(p.y))
                    .x((p) => xScale?.(p.x) ?? 0)
                    .y0(yScale(0))
                    .y1((p) => yScale(p.y))
                    .curve(curveMonotoneX);
                  const d = lineGen(withGaps) ?? undefined;
                  return (
                    <g key={s.key}>
                      {selected && sorted.length > 1 ? (
                        <path d={areaGen(withGaps) ?? undefined} fill={color} fillOpacity={0.1} />
                      ) : null}
                      {sorted.length > 1 ? (
                        <path
                          d={d}
                          stroke={color}
                          strokeWidth={2}
                          strokeDasharray={seriesDash(index) || undefined}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      ) : null}
                      {sorted.map((p) => (
                        <circle
                          key={p.x.toISOString()}
                          cx={xScale?.(p.x) ?? 0}
                          cy={yScale(p.y)}
                          r={sorted.length === 1 ? 5 : 4}
                          fill={color}
                          stroke={SPEC_FLOOR}
                          strokeWidth={2}
                        />
                      ))}
                    </g>
                  );
                })
              : renderSeries.map((s, index) => {
                  const selected = s.key === selectedKey;
                  const color = specSeriesColor(index, { selected, breached: s.breached });
                  const groupWidth = bandScale.bandwidth() / renderSeries.length;
                  return s.points.map((p) => {
                    const groupX = bandScale(p.x.toISOString()) ?? 0;
                    const barWidth = Math.min(groupWidth * 0.7, 24);
                    const barX = groupX + groupWidth * index + (groupWidth - barWidth) / 2;
                    const barY = yScale(p.y);
                    return (
                      <rect
                        key={`${s.key}-${p.x.toISOString()}`}
                        x={barX}
                        y={barY}
                        width={Math.max(barWidth, 1)}
                        height={Math.max(plotHeight - barY, 0)}
                        rx={2}
                        fill={color}
                      />
                    );
                  });
                })}
            {/* The budget-burn-down reference ceiling — a dashed rule, never a second colour
                convention: a series that crosses it already renders in the accent via the
                `breached` override computed above. */}
            {ceiling !== undefined ? (
              <line
                x1={0}
                x2={plotWidth}
                y1={yScale(ceiling)}
                y2={yScale(ceiling)}
                stroke={SPEC_BASELINE}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            ) : null}
          </g>
        </svg>
        {timestamps.map((d, index) => {
          const rawX =
            variant === 'bars'
              ? (bandScale(d.toISOString()) ?? 0) + bandScale.bandwidth() / 2
              : (xScale?.(d) ?? 0);
          const hitWidth = Math.max(bandScale.step() || MIN_HIT_WIDTH, MIN_HIT_WIDTH / 2);
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
      <div className="mt-2">
        <ChartLegend items={legendItems} selectedKey={selectedKey} onSelectKey={handleSelect} />
      </div>
    </div>
  );
}
