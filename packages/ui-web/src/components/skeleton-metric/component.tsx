import React from 'react';

import { cn } from '../../cn';
import type { SkeletonMetricProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — `--raised` block matching
// the final geometry of a `metric` numeral (22–26px line height) exactly. No shimmer, no spinner.
export function SkeletonMetric({ width = 88, className }: SkeletonMetricProps) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('inline-block h-[22px] rounded-[2px] bg-raised', className)}
      style={{ width }}
    />
  );
}
