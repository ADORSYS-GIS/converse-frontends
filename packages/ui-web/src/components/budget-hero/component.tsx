import React from 'react';

import { cn } from '../../cn';
import { formatMoney } from '../../lib/money';
import { Meter } from '../meter';
import type { BudgetHeroProps } from './types';

// Trailing action/caption row — identical markup on both branches below, factored out so the
// `'ready'`/`'unwired'` split doesn't have to duplicate it.
function BudgetHeroFooter({ action, caption }: Pick<BudgetHeroProps, 'action' | 'caption'>) {
  if (!action && !caption) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {action}
      {caption ? <span className="text-subtle font-sans text-[10px]">{caption}</span> : null}
    </div>
  );
}

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.1 — the OpenAI
// "number beside its ceiling beside its control" unit: `metric` numeral + `of $ceiling` +
// `Meter` + caption + inline action slot. Renders uncontained — panelling is the consumer's
// decision (console-ui skill).
//
// #273 — `status="unwired"` (see `BudgetHeroUnwiredProps`) swaps the numeral row for its own
// headline at the SAME 26px/`text-ink` weight the real numeral carries, and omits the meter
// entirely (a 0%-filled track next to an unknown ceiling would itself be a fabricated fact). The
// caption stays available for the "why," but the dominant element is now honest, not a false
// `$0.00 of $0.00`.
export function BudgetHero(props: BudgetHeroProps) {
  const { action, caption, className } = props;

  if (props.status === 'unwired') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <span className="text-ink font-mono text-[26px] leading-[1.2]">Not wired</span>
        <BudgetHeroFooter action={action} caption={caption} />
      </div>
    );
  }

  const { value, ceiling, threshold } = props;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-ink font-mono text-[26px] leading-[1.2]">{formatMoney(value)}</span>
        <span className="text-subtle font-mono text-sm">of {formatMoney(ceiling)}</span>
      </div>

      <Meter value={value} ceiling={ceiling} threshold={threshold} showCaption={false} />

      <BudgetHeroFooter action={action} caption={caption} />
    </div>
  );
}
