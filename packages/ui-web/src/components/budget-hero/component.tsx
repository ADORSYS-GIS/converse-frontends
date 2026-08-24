import React from 'react';

import { cn } from '../../cn';
import { formatMoney } from '../../lib/money';
import { Meter } from '../meter';
import type { BudgetHeroProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.1 — the OpenAI
// "number beside its ceiling beside its control" unit: `metric` numeral + `of $ceiling` +
// `Meter` + caption + inline action slot. Renders uncontained — panelling is the consumer's
// decision (console-ui skill).
export function BudgetHero({ value, ceiling, threshold, caption, action, className }: BudgetHeroProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[26px] leading-[1.2] text-ink">{formatMoney(value)}</span>
        <span className="font-mono text-sm text-subtle">of {formatMoney(ceiling)}</span>
      </div>

      <Meter value={value} ceiling={ceiling} threshold={threshold} showCaption={false} />

      {action || caption ? (
        <div className="flex flex-wrap items-center gap-3">
          {action}
          {caption ? <span className="font-sans text-[10px] text-subtle">{caption}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
