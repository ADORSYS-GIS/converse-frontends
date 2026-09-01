import React from 'react';

import { cn } from '../../cn';
import type { SkeletonMetricProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — `--raised` block matching
// the final geometry of a `metric` numeral (22–26px line height) exactly. No shimmer, no spinner.
//
// PRIMITIVE-MATRIX row 25: daisy's `skeleton` supplies the `raised` fill and the 2px radius; its
// shimmer is killed centrally by the `@utility skeleton` override in `theme.css`. `inline-block`
// stays ours — daisy leaves `display` alone and this block sits inline beside a numeral.
export function SkeletonMetric({ width = 88, className }: SkeletonMetricProps) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('skeleton inline-block h-[22px]', className)}
      style={{ width }}
    />
  );
}
