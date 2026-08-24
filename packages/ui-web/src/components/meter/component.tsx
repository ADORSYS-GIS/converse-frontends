import React from 'react';

import { cn } from '../../cn';
import { formatMoneyOf } from '../../lib/money';
import type { MeterProps } from './types';

const DEFAULT_THRESHOLD = 0.9;

// Contract: docs/design/console-redesign/README.md §4 (data display) / §2.4 — 4px `--raised`
// track + fill; `--body` under threshold, `--signal` at or past it; always paired with the
// "$X of $Y" mono caption.
export function Meter({
  value,
  ceiling,
  threshold = DEFAULT_THRESHOLD,
  showCaption = true,
  label = 'Consumption',
  className,
}: MeterProps) {
  const ratio = ceiling > 0 ? value / ceiling : 0;
  const percent = Math.min(Math.max(ratio, 0), 1) * 100;
  const breached = ratio >= threshold;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={ceiling}
        className="h-1 w-full rounded-[2px] bg-raised"
      >
        <div
          className={cn('h-1 rounded-[2px]', breached ? 'bg-primary' : 'bg-soft')}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showCaption ? (
        <p className="font-mono text-xs text-soft">{formatMoneyOf(value, ceiling)}</p>
      ) : null}
    </div>
  );
}
