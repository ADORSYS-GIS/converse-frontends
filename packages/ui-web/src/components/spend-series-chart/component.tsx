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
import { SPEC_FLOOR, seriesDash, specSeriesColor } from '../../chart-tokens';
import { ChartLegend } from '../chart-legend';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { ChartEmptyMessage } from '../../lib/chart-empty-message';
import { ChartHitRegion } from '../../lib/chart-hit-region';
import { useHoverActive } from '../../lib/use-hover-active';
import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import { collectTimestamps, collectYDomain } from './domain';
import type { SpendSeriesChartProps } from './types';

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
  const yDomain = useMemo(() => collectYDomain(series), [series]);

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
    return series
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
  }, [activeTimestamp, series, selectedKey, formatTooltipValue]);

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
    const firstPoint = series[0]?.points.find((p) => p.x.getTime() === activeTimestamp.getTime());
    const y = MARGIN.top + (firstPoint ? yScale(firstPoint.y) : 0);
    return { x, y };
  }, [activeTimestamp, variant, bandScale, xScale, series, yScale]);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({
      open: activeIndex !== null && svgElement !== null,
      anchorElement: svgElement,
      pinnedPoint: activeInput === 'hover' ? null : pinnedPoint,
    });

  const legendItems = useMemo(
    () =>
      series.map((s) => ({
        key: s.key,
        label: s.label,
        value: formatLegendValue?.(s),
        breached: s.breached,
      })),
    [series, formatLegendValue]
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
            ? series.map((s, index) => {
                const selected = s.key === selectedKey;
                const color = specSeriesColor(index, { selected, breached: s.breached });
                const sorted = [...s.points].sort((a, b) => a.x.getTime() - b.x.getTime());
                const lineGen = d3Line<(typeof sorted)[number]>()
                  .x((p) => xScale?.(p.x) ?? 0)
                  .y((p) => yScale(p.y))
                  .curve(curveMonotoneX);
                const areaGen = d3Area<(typeof sorted)[number]>()
                  .x((p) => xScale?.(p.x) ?? 0)
                  .y0(yScale(0))
                  .y1((p) => yScale(p.y))
                  .curve(curveMonotoneX);
                const d = lineGen(sorted) ?? undefined;
                return (
                  <g key={s.key}>
                    {selected && sorted.length > 1 ? (
                      <path d={areaGen(sorted) ?? undefined} fill={color} fillOpacity={0.1} />
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
            : series.map((s, index) => {
                const selected = s.key === selectedKey;
                const color = specSeriesColor(index, { selected, breached: s.breached });
                const groupWidth = bandScale.bandwidth() / series.length;
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
      <div className="mt-2">
        <ChartLegend items={legendItems} selectedKey={selectedKey} onSelectKey={handleSelect} />
      </div>
    </div>
  );
}
