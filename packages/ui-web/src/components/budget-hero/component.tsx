import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../error-line';
import { formatUsd } from '../../lib/money';
import { Meter } from '../meter';
import type { BudgetHeroProps } from './types';

// Trailing action/caption row — identical markup across every branch below, factored out so
// none of them has to duplicate it.
function BudgetHeroFooter({
  action,
  caption,
}: {
  action?: React.ReactNode;
  caption?: React.ReactNode;
}) {
  if (!action && !caption) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {action}
      {caption ? <span className="text-subtle font-sans text-[10px]">{caption}</span> : null}
    </div>
  );
}

// Skeleton matching the `'ready'` branch's own numeral + meter geometry exactly (console-ui
// skill states: "skeleton blocks matching final geometry", no spinner, no shimmer).
function BudgetHeroSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="presentation" aria-hidden="true">
      <div className="bg-raised h-[26px] w-32 rounded-[2px]" />
      <div className="bg-raised h-1 w-full rounded-[2px]" />
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
//
// #306 — `'loading'`/`'error'` carry the same distinction `DashboardStatus` already draws for
// `SpendDashboard`/`LatencyDashboard`: "never queried" (`'unwired'`), "queried, waiting"
// (`'loading'`), "queried, failed" (`'error'`) and "queried, here's the real number" (`'ready'`,
// including a real `$0.00`) are four different facts and must never collapse into one rendering.
export function BudgetHero(props: BudgetHeroProps) {
  const { className } = props;

  if (props.status === 'loading') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <BudgetHeroSkeleton />
      </div>
    );
  }

  if (props.status === 'error') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <ErrorLine
          message={props.errorMessage ?? 'Failed to load budget consumption.'}
          onRetry={props.onRetry}
        />
      </div>
    );
  }

  if (props.status === 'unwired') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <span className="text-ink font-mono text-[26px] leading-[1.2]">Not wired</span>
        <BudgetHeroFooter action={props.action} caption={props.caption} />
      </div>
    );
  }

  const { value, ceiling, threshold, action, caption } = props;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-ink font-mono text-[26px] leading-[1.2]">{formatUsd(value)}</span>
        <span className="text-subtle font-mono text-sm">of {formatUsd(ceiling)}</span>
      </div>

      <Meter value={value} ceiling={ceiling} threshold={threshold} showCaption={false} />

      <BudgetHeroFooter action={action} caption={caption} />
    </div>
  );
}
