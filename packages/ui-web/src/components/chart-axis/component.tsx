import React from 'react';

import { SPEC_BASELINE, SPEC_GRID, SPEC_TEXT_MUTED } from '../../chart-tokens';
import type { ChartAxisBottomProps, ChartAxisLeftProps } from './types';

const TICK_FONT_SIZE = 9; // console-redesign spec §2.4 "tick labels 9px" -- RN source used 11px.

/**
 * Bottom (x) axis: a hairline baseline plus tick labels, optionally with
 * gridlines rising off each tick. Renders `<g>`/`<line>`/`<text>` -- it is
 * meant to be nested inside a chart's own `<svg>`, not to own one itself, so
 * every primitive's axis reads as part of the same canvas rather than a
 * separately-bordered widget (ADR-0008 Decision 3: "charts render uncontained
 * on the floor").
 *
 * DOM port of packages/ui's `chart-axis` (react-native-svg -> `<svg>`).
 * Colours diverge from the RN source's single `CHART_GRID` constant per the
 * spec sheet: the baseline draws in `--line` (`#3a3a3a`), gridlines in
 * `--raised` (`#202020`) -- see `chart-tokens.ts` for the full divergence note.
 */
export function ChartAxisBottom({ ticks, y, x1, x2, gridHeight = 0 }: ChartAxisBottomProps) {
  if (ticks.length === 0) {
    return null;
  }
  const start = x1 ?? ticks[0].position;
  const end = x2 ?? ticks[ticks.length - 1].position;
  return (
    <g>
      <line x1={start} y1={y} x2={end} y2={y} stroke={SPEC_BASELINE} strokeWidth={1} />
      {ticks.map((tick) => (
        <g key={`${tick.label}-${tick.position}`}>
          {gridHeight > 0 ? (
            <line
              x1={tick.position}
              y1={y}
              x2={tick.position}
              y2={y - gridHeight}
              stroke={SPEC_GRID}
              strokeWidth={1}
            />
          ) : null}
          <text
            x={tick.position}
            y={y + 16}
            fontSize={TICK_FONT_SIZE}
            fill={SPEC_TEXT_MUTED}
            textAnchor="middle">
            {tick.label}
          </text>
        </g>
      ))}
    </g>
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
    <g>
      <line x1={x} y1={start} x2={x} y2={end} stroke={SPEC_BASELINE} strokeWidth={1} />
      {ticks.map((tick) => (
        <g key={`${tick.label}-${tick.position}`}>
          {gridWidth > 0 ? (
            <line
              x1={x}
              y1={tick.position}
              x2={x + gridWidth}
              y2={tick.position}
              stroke={SPEC_GRID}
              strokeWidth={1}
            />
          ) : null}
          <text
            x={x - 8}
            y={tick.position}
            fontSize={TICK_FONT_SIZE}
            fill={SPEC_TEXT_MUTED}
            textAnchor="end"
            dominantBaseline="middle">
            {tick.label}
          </text>
        </g>
      ))}
    </g>
  );
}
