import React, { useMemo, useState } from 'react';
import { arc as d3Arc, pie as d3Pie } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';

import {
  SPEC_FLOOR,
  SPEC_GRID,
  SPEC_TEXT_MUTED,
  SPEC_TEXT_PRIMARY,
  specSeriesColor,
} from '../../chart-tokens';
import { ChartLegend } from '../chart-legend';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { useHoverActive } from '../../lib/use-hover-active';
import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import type { DonutChartProps, DonutSlice } from './types';

const DEFAULT_EMPTY_MESSAGE = 'No spend in this range.';
const RING_THICKNESS_RATIO = 0.38; // inner radius = outer * (1 - ratio)
const OUTER_INSET = 4; // keeps the stroke from clipping against the svg edge

const identityFormatValue = (slice: DonutSlice) => String(Math.round(slice.value));

function percentOf(value: number, total: number): number {
  return total > 0 ? (Math.max(value, 0) / total) * 100 : 0;
}

/**
 * Donut primitive -- "share of a whole by project" (the console has no pie/donut chart today;
 * added per owner brief 2026-08-24). DOM `<svg>` port using `d3-shape`'s `pie()`/`arc()`
 * directly (there is no `chart-core` donut math to port from -- unlike the time-series/histogram/
 * ridgeline primitives, this one originates in the DOM build).
 *
 * Colour follows the same ADR-0008 Decision 6 rule as every other chart here (console-ui skill
 * "Charts"): a monochrome rank ramp via `specSeriesColor`, with the accent reserved for "needs
 * you." Unlike `SpendSeriesChart` (which lets every breached series render in the accent
 * independently), this component enforces the "at most one slice" half of the rule itself rather
 * than trusting the caller's data: `accentKey` resolves to the controlled/internal selection
 * first, falling back to the FIRST breached slice in series order, and only that one key ever
 * receives `specSeriesColor`'s `selected: true` -- so two `breached: true` slices in the input
 * still produce exactly one orange wedge, not two.
 *
 * Selection is dual-mode, same contract as `ChartLegend`: pass `selectedKey` to control it (so a
 * host page can keep this donut, its own `ChartLegend`, and a sibling time-series chart's rail
 * legend on the same `selectedKey` state), or omit it and the chart tracks its own selection
 * internally, same as `SpendSeriesChart`.
 *
 * Keyboard access is belt-and-braces: every wedge is itself a focusable, `role="button"` `<path>`
 * (native tab order, `Enter`/`Space` activation -- not a roving-tabindex widget, so this does not
 * trip the skill's "never hand-write a roving tabIndex" rule), AND the composed `ChartLegend`
 * below the ring is a fully keyboard-operable accessible list of the same data, satisfying either
 * half of the brief's "slices focusable or an accompanying accessible list."
 *
 * Hover tooltip uses the same `useHoverActive` + `useChartTooltipFloating` mechanism as every
 * sibling chart -- a live pointer follows the cursor continuously; a touch tap or keyboard focus
 * pins the card at the active wedge's `arc.centroid()`. Previously wired onto a bespoke
 * `onMouseEnter`/`onMouseLeave` pair, which never fired for a touch tap (a plain `mouseenter` is
 * not a touch-pointer event) -- unified here onto the shared mechanism, fixing that gap.
 */
export function DonutChart({
  slices,
  width,
  height,
  selectedKey,
  onSelectSlice,
  centreMetric,
  centreLabel,
  formatTooltipValue = identityFormatValue,
  formatLegendValue,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: DonutChartProps) {
  const [internalSelectedKey, setInternalSelectedKey] = useState<string | null>(null);
  // Which slice the tooltip is anchored to -- hover/focus/tap-driven, deliberately independent
  // of `selectedKey`/`internalSelectedKey` (click-driven, see `handleSelect`). Unified onto the
  // same `useHoverActive` + `useChartTooltipFloating` mechanism every sibling chart uses (this
  // component previously drove it off a bespoke `onMouseEnter`/`onMouseLeave` pair on each wedge,
  // which never fired for a touch tap -- a plain `mouseenter` is not a touch-pointer event).
  const { active: hoveredKey, activeInput, getHoverProps } = useHoverActive<string>();
  // The tooltip's Floating UI virtual element needs a real `contextElement` -- state, not a plain
  // ref, so the tooltip re-renders once the `<svg>` mounts (same pattern as every sibling chart).
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const isControlled = selectedKey !== undefined;
  const resolvedSelectedKey = isControlled ? selectedKey : internalSelectedKey;

  function handleSelect(key: string | null) {
    if (!isControlled) {
      setInternalSelectedKey(key);
    }
    onSelectSlice?.(key);
  }

  const total = useMemo(() => slices.reduce((sum, s) => sum + Math.max(s.value, 0), 0), [slices]);

  // Single-accent rule (module doc): selection wins; otherwise the first breached slice, and only
  // ever that one key.
  const breachedKey = useMemo(() => slices.find((s) => s.breached)?.key ?? null, [slices]);
  const accentKey = resolvedSelectedKey ?? breachedKey;

  const radius = Math.min(width, height) / 2;
  const outerRadius = Math.max(radius - OUTER_INSET, 0);
  const innerRadius = outerRadius * (1 - RING_THICKNESS_RATIO);
  const cx = width / 2;
  const cy = height / 2;

  const pieGenerator = useMemo(
    () =>
      d3Pie<DonutSlice>()
        .value((d) => Math.max(d.value, 0))
        .sort(null), // series-rank order, never re-sorted by value (same rule as every ramp here)
    []
  );
  const arcGenerator = useMemo(
    () => d3Arc<PieArcDatum<DonutSlice>>().innerRadius(innerRadius).outerRadius(outerRadius),
    [innerRadius, outerRadius]
  );

  const arcs = useMemo(
    () => (slices.length > 0 && total > 0 ? pieGenerator(slices) : []),
    [pieGenerator, slices, total]
  );

  const legendItems = useMemo(
    () =>
      slices.map((s) => ({
        key: s.key,
        label: s.label,
        value: formatLegendValue?.(s, percentOf(s.value, total)),
        breached: s.key === breachedKey,
      })),
    [slices, formatLegendValue, total, breachedKey]
  );

  const activeArc = hoveredKey ? arcs.find((a) => a.data.key === hoveredKey) : undefined;

  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeArc) return [];
    const index = slices.findIndex((s) => s.key === activeArc.data.key);
    return [
      {
        key: activeArc.data.key,
        label: activeArc.data.label,
        value: formatTooltipValue(activeArc.data, percentOf(activeArc.data.value, total)),
        color: specSeriesColor(index, { selected: activeArc.data.key === accentKey }),
      },
    ];
  }, [activeArc, slices, formatTooltipValue, total, accentKey]);

  // The tooltip's frozen fallback point for touch/keyboard activation -- the active wedge's own
  // centroid. Unused while a live pointer drives `activeInput` ('hover'): see
  // `useChartTooltipFloating`'s docstring for why that case tracks the real cursor instead.
  const pinnedPoint = useMemo(() => {
    if (!activeArc) return null;
    const [dx, dy] = arcGenerator.centroid(activeArc);
    return { x: cx + dx, y: cy + dy };
  }, [activeArc, arcGenerator, cx, cy]);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({
      open: hoveredKey !== null && svgElement !== null,
      anchorElement: svgElement,
      pinnedPoint: activeInput === 'hover' ? null : pinnedPoint,
    });

  if (slices.length === 0 || total <= 0) {
    return (
      <div style={{ width }} className="flex flex-col items-center gap-3">
        <svg width={width} height={height} role="presentation" aria-hidden="true">
          <circle
            cx={cx}
            cy={cy}
            r={(outerRadius + innerRadius) / 2}
            fill="none"
            stroke={SPEC_GRID}
            strokeWidth={outerRadius - innerRadius}
          />
          <text
            x={cx}
            y={cy}
            fontSize={10}
            fill={SPEC_TEXT_MUTED}
            textAnchor="middle"
            dominantBaseline="middle">
            {emptyMessage}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width }} className="flex flex-col items-center gap-3">
      <div style={{ width, height, position: 'relative' }}>
        <svg
          ref={setSvgElement}
          width={width}
          height={height}
          role="img"
          aria-label={
            centreLabel && centreMetric ? `${centreLabel}: ${centreMetric}` : 'Spend share'
          }>
          <g transform={`translate(${cx}, ${cy})`}>
            {arcs.map((a) => {
              const index = slices.findIndex((s) => s.key === a.data.key);
              const isAccent = a.data.key === accentKey;
              const isSelected = a.data.key === resolvedSelectedKey;
              const color = specSeriesColor(index, { selected: isAccent });
              const d = arcGenerator(a) ?? undefined;
              const percent = percentOf(a.data.value, total);
              return (
                <path
                  key={a.data.key}
                  d={d}
                  fill={color}
                  stroke={SPEC_FLOOR}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${a.data.label}, ${formatTooltipValue(a.data, percent)}${a.data.breached ? ', over ceiling' : ''}`}
                  className="cursor-pointer outline-none focus-visible:opacity-80"
                  onClick={() => handleSelect(isSelected ? null : a.data.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelect(isSelected ? null : a.data.key);
                    }
                  }}
                  {...getReferenceProps(getHoverProps(a.data.key))}
                />
              );
            })}
          </g>
          {centreMetric ? (
            <text
              x={cx}
              y={centreLabel ? cy - 4 : cy}
              fontSize={22}
              fill={SPEC_TEXT_PRIMARY}
              textAnchor="middle"
              dominantBaseline="middle">
              {centreMetric}
            </text>
          ) : null}
          {centreLabel ? (
            <text
              x={cx}
              y={centreMetric ? cy + 16 : cy}
              fontSize={10}
              fill={SPEC_TEXT_MUTED}
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="0.9"
              style={{ textTransform: 'uppercase' }}>
              {centreLabel}
            </text>
          ) : null}
        </svg>
        <ChartTooltip
          visible={hoveredKey !== null}
          rows={tooltipRows}
          setFloating={setFloating}
          floatingStyles={floatingStyles}
          getFloatingProps={getFloatingProps}
        />
      </div>
      <ChartLegend
        items={legendItems}
        selectedKey={resolvedSelectedKey}
        onSelectKey={handleSelect}
      />
    </div>
  );
}
