import React from 'react';
import { curveMonotoneX, line as d3Line } from 'd3-shape';
import { makeLinearScale } from '@lightbridge/chart-core';

/**
 * The per-row trend mark inside `RankedSeriesRows` — deliberately NOT `SpendSeriesChart`: a row's
 * sparkline has no axes, no tooltip and no shared domain with its neighbours (see this module's
 * own `types.ts` doc on why the scale is per-row). Small enough, and different enough in shape
 * from a full chart, that it stays a local sub-part rather than a `components/` primitive — the
 * build brief's own call ("a small `Sparkline` sub-part is fine inside the section").
 *
 * Math comes straight from `@lightbridge/chart-core` (`makeLinearScale`), same as every other
 * chart in this package — no chart framework, DOM `<svg>` only.
 */
const WIDTH = 56;
const HEIGHT = 18;
const INSET = 2;

export function Sparkline({ points, color }: { points: number[]; color: string }) {
  // Fewer than 2 points has no shape to draw — a flat dash says "no trend data" without drawing a
  // single dot stretched (or collapsed) into a misleading line.
  if (points.length < 2) {
    return (
      <svg width={WIDTH} height={HEIGHT} aria-hidden="true" className="ranked-sparkline">
        <line
          x1={INSET}
          y1={HEIGHT / 2}
          x2={WIDTH - INSET}
          y2={HEIGHT / 2}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="2 3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Per-row NORMALIZED scale (dominance-proof): this row's own [0, max] range, never a domain
  // shared across rows in the list.
  const yScale = makeLinearScale([0, Math.max(...points, 0)], [HEIGHT - INSET, INSET]);
  const step = (WIDTH - INSET * 2) / (points.length - 1);
  const coords = points.map((value, index) => ({ x: INSET + index * step, y: yScale(value) }));

  const lineGen = d3Line<(typeof coords)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(curveMonotoneX);

  return (
    <svg width={WIDTH} height={HEIGHT} aria-hidden="true" className="ranked-sparkline">
      <path
        d={lineGen(coords) ?? undefined}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
