import React from 'react';

import { cn } from '../../cn';
import type { SparklineProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (data display) — 81×26 unlabelled
// polyline in `--line` with a `--body` terminal dot; decorative-free, no axis, no tooltip.
const DEFAULT_WIDTH = 81;
const DEFAULT_HEIGHT = 26;
const VERTICAL_INSET = 3;

export function Sparkline({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const plotHeight = height - VERTICAL_INSET * 2;
  const stepX = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = VERTICAL_INSET + plotHeight - ((value - min) / range) * plotHeight;
    return [x, y] as const;
  });

  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('text-border', className)}
      aria-hidden="true"
    >
      <polyline
        points={points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={1.8} className="fill-soft" />
    </svg>
  );
}
