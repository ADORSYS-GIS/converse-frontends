import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { G, Path, Svg, Text as SvgText } from 'react-native-svg';
import { area as d3Area, curveBasis } from 'd3-shape';

import { ChartAxisBottom } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import {
  CHART_TEXT_MUTED,
  CHART_TEXT_PRIMARY,
  DEFAULT_CHART_MARGIN,
  computeSharedBins,
  innerHeight,
  innerWidth,
  makeLinearScale,
  seriesColor,
  seriesDash,
  widenDegenerateDomain,
} from '@lightbridge/chart-core';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { buildRidgelineRows } from './layout';
import type { RidgelineRowLayout } from './layout';
import type { RidgelineChartProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const MIN_HIT_HEIGHT = 44;
const DEFAULT_BIN_COUNT = 20;
const MARGIN = { ...DEFAULT_CHART_MARGIN, top: 16, left: 108 };

const identityFormatTick = (v: number) => String(Math.round(v));
const identityFormatTooltip = (bin: { count: number }) => String(bin.count);

/**
 * Ridgeline (joyplot) primitive -- "per-model latency distribution" (ADR-0008
 * dashboard 2). Several series of raw numeric samples, each drawn as one
 * overlapping density row stacked top-to-bottom, sharing one x-axis (the
 * value domain, via `chart-core`'s `computeSharedBins` -- see its doc comment
 * for why every row must bucket against the *same* edges) but with each row's
 * height normalized to **its own peak**, not a shared count scale.
 *
 * That per-row normalization is deliberate, not an oversight: a shared count
 * scale would flatten a low-sample-count row into near-invisibility next to a
 * high-sample-count one, which is exactly the "one series dwarfing the rest"
 * failure mode a ridgeline exists to avoid. Normalizing per row is what makes
 * this primitive about each series' *shape*, matching ADR-0008 Decision 6's
 * own framing ("ridgeline plots especially benefit since they read on shape,
 * not hue") -- see `layout.ts`'s `normalizeRowCounts` for the maths.
 *
 * Rows are direct-labelled (never a legend box -- with each row already
 * carrying its own label beside it, a separate legend would be redundant
 * chrome for this primitive specifically, unlike the multi-series overlay in
 * `time-series-chart`). Colour/dash still follow the shared monochrome-ramp +
 * accent-on-selection rule (`chart-core/colors`) as a secondary identity
 * channel, and label text itself never wears the series colour (only
 * `CHART_TEXT_PRIMARY`/`CHART_TEXT_MUTED`) -- shape and position carry the
 * primary signal here.
 *
 * Renders on a fixed `width`/`height`, same pixel-driven contract as every
 * other primitive here; the caller measures its own layout and passes pixels
 * down.
 */
export function RidgelineChart({
  series,
  width,
  height,
  binCount = DEFAULT_BIN_COUNT,
  formatXTick = identityFormatTick,
  formatTooltipValue = identityFormatTooltip,
  onSelectSeries,
}: RidgelineChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const plotWidth = innerWidth(width, MARGIN);
  const plotHeight = innerHeight(height, MARGIN);

  const { edges, counts } = useMemo(
    () =>
      computeSharedBins(
        series.map((s) => s.values),
        binCount
      ),
    [series, binCount]
  );

  const domain = useMemo<[number, number]>(() => {
    if (edges.length >= 2) {
      return [edges[0], edges[edges.length - 1]];
    }
    return widenDegenerateDomain([0, 0]);
  }, [edges]);

  const xScale = useMemo(() => makeLinearScale(domain, [0, plotWidth]), [domain, plotWidth]);

  const rows = useMemo(
    () =>
      buildRidgelineRows(series, edges, counts, plotHeight, (value) => xScale(value), {
        fallbackDomain: domain,
      }),
    [series, edges, counts, plotHeight, xScale, domain]
  );

  function handleSelect(key: string) {
    const next = selectedKey === key ? null : key;
    setSelectedKey(next);
    onSelectSeries?.(next);
    setActiveKey((current) => (current === key ? null : key));
  }

  const xTicks: ChartTick[] = useMemo(() => {
    return xScale
      .ticks(6)
      .map((value) => ({ position: MARGIN.left + xScale(value), label: formatXTick(value) }));
  }, [xScale, formatXTick]);

  const activeRow = activeKey ? (rows.find((r) => r.key === activeKey) ?? null) : null;
  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeRow || !activeRow.peakBin) return [];
    const index = series.findIndex((s) => s.key === activeRow.key);
    return [
      {
        key: activeRow.key,
        label: `${formatXTick(activeRow.peakBin.x0)}–${formatXTick(activeRow.peakBin.x1)}`,
        value: formatTooltipValue(activeRow.peakBin),
        color: seriesColor(index, {
          selected: activeRow.key === selectedKey,
          breached: activeRow.breached,
        }),
      },
    ];
  }, [activeRow, series, formatXTick, formatTooltipValue, selectedKey]);

  if (series.length === 0) {
    return (
      <ViewBase style={{ width, height }}>
        <Svg width={width} height={height}>
          <G x={MARGIN.left} y={MARGIN.top}>
            <ChartAxisBottom y={plotHeight} x1={0} x2={plotWidth} ticks={[]} />
          </G>
        </Svg>
      </ViewBase>
    );
  }

  return (
    <ViewBase style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height}>
        <G x={MARGIN.left} y={MARGIN.top}>
          <ChartAxisBottom y={plotHeight} x1={0} x2={plotWidth} ticks={xTicks} />
          {rows.map((row, index) => {
            const selected = row.key === selectedKey;
            const color = seriesColor(index, { selected, breached: row.breached });
            const areaGen = d3Area<RidgelineRowLayout['points'][number]>()
              .x((p) => p.x)
              .y0(row.baselineY)
              .y1((p) => p.y)
              .curve(curveBasis);
            const d = areaGen(row.points) ?? undefined;
            return (
              <G key={row.key}>
                <Path d={d} fill={color} fillOpacity={0.12} />
                <Path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={selected || row.breached ? 2 : 1.5}
                  strokeDasharray={seriesDash(index) || undefined}
                  strokeLinejoin="round"
                />
                <SvgText
                  x={-8}
                  y={row.baselineY - 4}
                  fontSize={11}
                  fill={selected || row.breached ? CHART_TEXT_PRIMARY : CHART_TEXT_MUTED}
                  textAnchor="end">
                  {row.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
      {rows.map((row) => (
        <Pressable
          key={row.key}
          onPress={() => handleSelect(row.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: row.key === selectedKey }}
          accessibilityLabel={row.breached ? `${row.label}, over ceiling` : row.label}
          style={{
            position: 'absolute',
            left: 0,
            top: MARGIN.top + Math.max(row.baselineY - row.amplitude, 0) - MIN_HIT_HEIGHT / 2,
            width: MARGIN.left + plotWidth,
            height: Math.max(row.amplitude, MIN_HIT_HEIGHT),
          }}
        />
      ))}
      {activeRow ? (
        <ChartTooltip
          visible={activeRow !== null}
          x={
            MARGIN.left +
            xScale(
              activeRow.peakBin ? (activeRow.peakBin.x0 + activeRow.peakBin.x1) / 2 : domain[0]
            )
          }
          y={MARGIN.top + Math.max(activeRow.baselineY - activeRow.amplitude, 8)}
          title={activeRow.label}
          rows={tooltipRows}
          containerWidth={width}
        />
      ) : null}
    </ViewBase>
  );
}
