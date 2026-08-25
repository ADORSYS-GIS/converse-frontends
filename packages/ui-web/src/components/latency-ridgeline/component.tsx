import React, { useMemo, useState } from 'react';
import { area as d3Area, curveBasis } from 'd3-shape';

import {
  DEFAULT_CHART_MARGIN,
  computeSharedBins,
  innerHeight,
  innerWidth,
  makeLinearScale,
  widenDegenerateDomain,
} from '@lightbridge/chart-core';

import { ChartAxisBottom } from '../chart-axis';
import type { ChartTick } from '../chart-axis';
import {
  SPEC_ACCENT,
  SPEC_SURFACE,
  SPEC_TEXT_MUTED,
  SPEC_TEXT_PRIMARY,
  seriesDash,
  specSeriesColor,
} from '../../chart-tokens';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { useHoverActive } from '../../lib/use-hover-active';
import { buildRidgelineRows } from './layout';
import type { RidgelineRowLayout } from './layout';
import type { LatencyRidgelineProps } from './types';

const MIN_HIT_HEIGHT = 44;
const DEFAULT_BIN_COUNT = 20;
const MARGIN = { ...DEFAULT_CHART_MARGIN, top: 16, left: 108 };
const DEFAULT_EMPTY_MESSAGE = 'No usage in this range.';

const identityFormatTick = (v: number) => String(Math.round(v));
const identityFormatTooltip = (bin: { count: number }) => String(bin.count);

/**
 * Ridgeline (joyplot) primitive -- "per-model latency distribution" (ADR-0008
 * dashboard 2). Several series of raw numeric samples, each drawn as one
 * overlapping density row stacked top-to-bottom, sharing one x-axis (the
 * value domain, via `chart-core`'s `computeSharedBins`) but with each row's
 * height normalized to **its own peak**, not a shared count scale (see
 * `layout.ts`'s `normalizeRowCounts` for why).
 *
 * DOM port of packages/ui's `ridgeline-chart`, renamed to
 * `LatencyRidgeline` per the console-redesign spec's §4 component inventory.
 * Two deliberate contract changes from the RN source, both spec-driven:
 *   - ridge fill is the flat `--panel` surface colour (`overview.svg`'s own
 *     `fill="#191919"`), not the series colour at low opacity the RN source
 *     used -- "shape carries the reading, so the fill is deliberately
 *     near-invisible" (spec §2.4).
 *   - each row now renders a right-hand `value` (e.g. `p95 312 ms`), per the
 *     inventory's "label left / value right" contract -- the RN source only
 *     surfaced a peak value in the tap-to-open tooltip, not persistently.
 */
export function LatencyRidgeline({
  series,
  width,
  height,
  binCount = DEFAULT_BIN_COUNT,
  formatXTick = identityFormatTick,
  formatTooltipValue = identityFormatTooltip,
  onSelectSeries,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: LatencyRidgelineProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Which row the tooltip is anchored to -- hover/focus-driven, deliberately independent of
  // `selectedKey` (click-driven, see `handleSelect`). See `useHoverActive`'s own docstring for
  // why hover, not just click, now drives this.
  const { active: activeKey, getHoverProps } = useHoverActive<string>();
  // The tooltip's Floating UI virtual element needs a real `contextElement` --
  // state, not a plain ref, so the tooltip re-renders once the `<svg>` mounts.
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const plotWidth = innerWidth(width, MARGIN);
  const plotHeight = innerHeight(height, MARGIN);

  const { edges, counts } = useMemo(
    () =>
      computeSharedBins(
        series.map((s) => s.values),
        binCount,
      ),
    [series, binCount],
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
    [series, edges, counts, plotHeight, xScale, domain],
  );

  const valueByKey = useMemo(() => new Map(series.map((s) => [s.key, s.value])), [series]);

  function handleSelect(key: string) {
    const next = selectedKey === key ? null : key;
    setSelectedKey(next);
    onSelectSeries?.(next);
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
        color: specSeriesColor(index, {
          selected: activeRow.key === selectedKey,
          breached: activeRow.breached,
        }),
      },
    ];
  }, [activeRow, series, formatXTick, formatTooltipValue, selectedKey]);

  if (series.length === 0) {
    return (
      <div style={{ width, height }}>
        <svg width={width} height={height}>
          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            <ChartAxisBottom y={plotHeight} x1={0} x2={plotWidth} ticks={[]} />
            <text
              x={plotWidth / 2}
              y={plotHeight / 2}
              fontSize={10}
              fill={SPEC_TEXT_MUTED}
              textAnchor="middle">
              {emptyMessage}
            </text>
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg ref={setSvgElement} width={width} height={height}>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <ChartAxisBottom y={plotHeight} x1={0} x2={plotWidth} ticks={xTicks} />
          {rows.map((row, index) => {
            const selected = row.key === selectedKey;
            const emphasized = selected || Boolean(row.breached);
            const stroke = specSeriesColor(index, { selected, breached: row.breached });
            const areaGen = d3Area<RidgelineRowLayout['points'][number]>()
              .x((p) => p.x)
              .y0(row.baselineY)
              .y1((p) => p.y)
              .curve(curveBasis);
            const d = areaGen(row.points) ?? undefined;
            const rowValue = valueByKey.get(row.key);
            return (
              <g key={row.key}>
                <path d={d} fill={SPEC_SURFACE} />
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={emphasized ? 2 : 1.5}
                  strokeDasharray={seriesDash(index) || undefined}
                  strokeLinejoin="round"
                />
                <text
                  x={-8}
                  y={row.baselineY - 4}
                  fontSize={10}
                  fill={emphasized ? SPEC_TEXT_PRIMARY : SPEC_TEXT_MUTED}
                  textAnchor="end">
                  {row.label}
                </text>
                {rowValue ? (
                  <text
                    x={plotWidth}
                    y={row.baselineY - 4}
                    fontSize={9}
                    fill={row.breached ? SPEC_ACCENT : SPEC_TEXT_MUTED}
                    textAnchor="end">
                    {rowValue}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          aria-pressed={row.key === selectedKey}
          aria-label={row.breached ? `${row.label}, over ceiling` : row.label}
          onClick={() => handleSelect(row.key)}
          {...getHoverProps(row.key)}
          className="absolute cursor-pointer bg-transparent p-0"
          style={{
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
          anchorElement={svgElement}
          x={
            MARGIN.left +
            xScale(activeRow.peakBin ? (activeRow.peakBin.x0 + activeRow.peakBin.x1) / 2 : domain[0])
          }
          y={MARGIN.top + Math.max(activeRow.baselineY - activeRow.amplitude, 8)}
          title={activeRow.label}
          rows={tooltipRows}
        />
      ) : null}
    </div>
  );
}
