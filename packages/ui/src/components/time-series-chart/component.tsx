import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { Circle, G, Path, Rect, Svg } from 'react-native-svg';
import { area as d3Area, line as d3Line, curveMonotoneX } from 'd3-shape';

import { ChartAxisBottom, ChartAxisLeft } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import {
  CHART_SURFACE,
  DEFAULT_CHART_MARGIN,
  innerHeight,
  innerWidth,
  makeBandScale,
  makeLinearScale,
  makeTimeScale,
  seriesColor,
  seriesDash,
} from '../chart-core';
import { ChartLegend } from '../chart-legend';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { collectTimestamps, collectYDomain } from './domain';
import type { TimeSeriesChartProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const MIN_HIT_WIDTH = 44;
const MARGIN = { ...DEFAULT_CHART_MARGIN, left: 52 };

const identityFormatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const identityFormatNumber = (v: number) => String(Math.round(v));

/**
 * Time-series / bar primitive -- "spend over time" (ADR-0008 dashboard 1).
 * `variant="line"` overlays one line per series; `variant="bars"` draws
 * grouped columns per timestamp. Both share the same monochrome-ramp +
 * accent-on-selection colour rule (ADR-0008 Decision 6) via
 * `chart-core/colors`, and both render uncontained on a transparent
 * background -- the caller's `#000` floor shows through (Decision 3).
 *
 * Renders on a fixed `width`/`height` (an SVG canvas has no intrinsic size);
 * the caller measures its own layout (`onLayout`/`useWindowDimensions`) and
 * passes pixels down, same as every other pixel-driven primitive here.
 */
export function TimeSeriesChart({
  series,
  width,
  height,
  variant = 'line',
  formatXTick = identityFormatDate,
  formatYTick = identityFormatNumber,
  formatTooltipValue = identityFormatNumber,
  formatTooltipTitle = formatXTick,
  onSelectSeries,
}: TimeSeriesChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
          color: seriesColor(index, { selected: s.key === selectedKey, breached: s.breached }),
        };
      })
      .filter((row): row is ChartTooltipRow => row !== null);
  }, [activeTimestamp, series, selectedKey, formatTooltipValue]);

  if (series.length === 0 || timestamps.length === 0) {
    return (
      <ViewBase style={{ width, height }}>
        <Svg width={width} height={height}>
          <ChartAxisLeft
            x={MARGIN.left}
            y1={MARGIN.top}
            y2={MARGIN.top + plotHeight}
            ticks={yTicks}
          />
        </Svg>
      </ViewBase>
    );
  }

  return (
    <ViewBase style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height}>
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
        <G x={MARGIN.left} y={MARGIN.top}>
          {variant === 'line'
            ? series.map((s, index) => {
                const selected = s.key === selectedKey;
                const color = seriesColor(index, { selected, breached: s.breached });
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
                  <G key={s.key}>
                    {selected && sorted.length > 1 ? (
                      <Path d={areaGen(sorted) ?? undefined} fill={color} fillOpacity={0.1} />
                    ) : null}
                    {sorted.length > 1 ? (
                      <Path
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
                      <Circle
                        key={p.x.toISOString()}
                        cx={xScale?.(p.x) ?? 0}
                        cy={yScale(p.y)}
                        r={sorted.length === 1 ? 5 : 4}
                        fill={color}
                        stroke={CHART_SURFACE}
                        strokeWidth={2}
                      />
                    ))}
                  </G>
                );
              })
            : series.map((s, index) => {
                const selected = s.key === selectedKey;
                const color = seriesColor(index, { selected, breached: s.breached });
                const groupWidth = bandScale.bandwidth() / series.length;
                return s.points.map((p) => {
                  const groupX = bandScale(p.x.toISOString()) ?? 0;
                  const barWidth = Math.min(groupWidth * 0.7, 24);
                  const barX = groupX + groupWidth * index + (groupWidth - barWidth) / 2;
                  const barY = yScale(p.y);
                  return (
                    <Rect
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
        </G>
      </Svg>
      {timestamps.map((d, index) => {
        const rawX =
          variant === 'bars'
            ? (bandScale(d.toISOString()) ?? 0) + bandScale.bandwidth() / 2
            : (xScale?.(d) ?? 0);
        const hitWidth = Math.max(bandScale.step() || MIN_HIT_WIDTH, MIN_HIT_WIDTH / 2);
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => setActiveIndex(activeIndex === index ? null : index)}
            style={{
              position: 'absolute',
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
        x={
          MARGIN.left +
          (activeTimestamp
            ? variant === 'bars'
              ? (bandScale(activeTimestamp.toISOString()) ?? 0) + bandScale.bandwidth() / 2
              : (xScale?.(activeTimestamp) ?? 0)
            : 0)
        }
        y={MARGIN.top + 8}
        title={activeTimestamp ? formatTooltipTitle(activeTimestamp) : undefined}
        rows={tooltipRows}
        containerWidth={width}
      />
      <ViewBase style={{ marginTop: 8 }}>
        <ChartLegend
          items={series.map((s) => ({ key: s.key, label: s.label, breached: s.breached }))}
          selectedKey={selectedKey}
          onSelectKey={handleSelect}
        />
      </ViewBase>
    </ViewBase>
  );
}
