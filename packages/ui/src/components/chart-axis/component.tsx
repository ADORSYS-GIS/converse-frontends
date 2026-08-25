import React from 'react';
import { G, Line, Text as SvgText } from 'react-native-svg';

import { CHART_GRID, CHART_TEXT_MUTED } from '@lightbridge/chart-core';
import type { ChartAxisBottomProps, ChartAxisLeftProps } from './types';

/**
 * Bottom (x) axis: a hairline baseline plus tick labels, optionally with
 * gridlines rising off each tick. Renders `<G>`/`<Line>`/`<Text>` -- it is
 * meant to be nested inside a chart's own `<Svg>`, not to own one itself, so
 * every primitive's axis reads as part of the same canvas rather than a
 * separately-bordered widget (ADR-0008 Decision 3: "charts render uncontained
 * on the floor").
 */
export function ChartAxisBottom({ ticks, y, x1, x2, gridHeight = 0 }: ChartAxisBottomProps) {
  if (ticks.length === 0) {
    return null;
  }
  const start = x1 ?? ticks[0].position;
  const end = x2 ?? ticks[ticks.length - 1].position;
  return (
    <G>
      <Line x1={start} y1={y} x2={end} y2={y} stroke={CHART_GRID} strokeWidth={1} />
      {ticks.map((tick) => (
        <G key={`${tick.label}-${tick.position}`}>
          {gridHeight > 0 ? (
            <Line
              x1={tick.position}
              y1={y}
              x2={tick.position}
              y2={y - gridHeight}
              stroke={CHART_GRID}
              strokeWidth={1}
            />
          ) : null}
          <SvgText
            x={tick.position}
            y={y + 16}
            fontSize={11}
            fill={CHART_TEXT_MUTED}
            textAnchor="middle">
            {tick.label}
          </SvgText>
        </G>
      ))}
    </G>
  );
}

/** Left (y) axis: a hairline baseline plus tick labels, optionally with gridlines extending right. */
export function ChartAxisLeft({ ticks, x, y1, y2, gridWidth = 0 }: ChartAxisLeftProps) {
  if (ticks.length === 0) {
    return null;
  }
  const start = y1 ?? ticks[0].position;
  const end = y2 ?? ticks[ticks.length - 1].position;
  return (
    <G>
      <Line x1={x} y1={start} x2={x} y2={end} stroke={CHART_GRID} strokeWidth={1} />
      {ticks.map((tick) => (
        <G key={`${tick.label}-${tick.position}`}>
          {gridWidth > 0 ? (
            <Line
              x1={x}
              y1={tick.position}
              x2={x + gridWidth}
              y2={tick.position}
              stroke={CHART_GRID}
              strokeWidth={1}
            />
          ) : null}
          <SvgText
            x={x - 8}
            y={tick.position}
            fontSize={11}
            fill={CHART_TEXT_MUTED}
            textAnchor="end"
            alignmentBaseline="middle">
            {tick.label}
          </SvgText>
        </G>
      ))}
    </G>
  );
}
