import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../error-line';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { formatUsd } from '../../lib/money';
import { HERO_CEILING_CLASS, HERO_METRIC_CLASS, PROSE_META_CLASS } from '../../lib/type-roles';
import { Meter } from '../meter';
import type { BudgetHeroProps } from './types';

// One stack, four branches. Every status renders into the same box so the zone never changes
// height or alignment as it resolves — see the `budget-hero` block in theme.css, which owns that
// stack and the loading branch's two block heights.

// Trailing action/caption row — identical markup across every branch below, factored out so
// none of them has to duplicate it. `INLINE_ROW_CLASS` is the console's shared status-line
// geometry (lib/inline-row.ts), the same box `InlineStatus` and `ErrorLine` render into.
function BudgetHeroFooter({
  action,
  caption,
}: {
  action?: React.ReactNode;
  caption?: React.ReactNode;
}) {
  if (!action && !caption) return null;
  return (
    <div className={INLINE_ROW_CLASS}>
      {action}
      {caption ? <span className={PROSE_META_CLASS}>{caption}</span> : null}
    </div>
  );
}

// Skeleton matching the `'ready'` branch's own numeral + meter geometry exactly (console-ui
// skill states: "skeleton blocks matching final geometry", no spinner, no shimmer). daisy
// `skeleton` is the fill and the 2px radius; the two heights that make it match are stated in
// theme.css beside the stack they sit in, keyed off this role="presentation".
function BudgetHeroSkeleton() {
  return (
    <div role="presentation" aria-hidden="true">
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.1 — the OpenAI
// "number beside its ceiling beside its control" unit: `metric` numeral + `of $ceiling` +
// `Meter` + caption + inline action slot. Renders uncontained — panelling is the consumer's
// decision (console-ui skill).
//
// PRIMITIVES.md's `budget-hero` row is NO UPSTREAM ("composition of Meter + numerals; nothing
// daisy adds"), and daisy `stat` is rejected outright for imposing its own padding and dividers.
// What the daisy/Base UI pass removed here was duplication, not paint: the wrapper stack was
// written out five times and both type treatments were re-declared locally. The semantics of the
// bar itself already come from Base UI, through `Meter`.
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
// The four branches differ only in what goes INSIDE the stack — which is the whole point of the
// stack being one box — so the wrapper is rendered once, here, and each branch returns its body.
// Written as four returns of the same wrapper it was four chances to disagree about it.
function BudgetHeroBody(props: BudgetHeroProps) {
  if (props.status === 'loading') {
    return <BudgetHeroSkeleton />;
  }

  if (props.status === 'error') {
    return (
      <ErrorLine
        message={props.errorMessage ?? 'Failed to load budget consumption.'}
        onRetry={props.onRetry}
      />
    );
  }

  if (props.status === 'unwired') {
    return (
      <>
        <span className={HERO_METRIC_CLASS}>Not wired</span>
        <BudgetHeroFooter action={props.action} caption={props.caption} />
      </>
    );
  }

  const { value, ceiling, threshold, action, caption } = props;
  return (
    <>
      {/* Baseline-aligned so the hero numeral and its ceiling sit on one line and wrap together
          rather than the ceiling dropping half a line below it. */}
      <div className="metric-ceiling-row">
        <span className={HERO_METRIC_CLASS}>{formatUsd(value)}</span>
        <span className={HERO_CEILING_CLASS}>of {formatUsd(ceiling)}</span>
      </div>

      <Meter value={value} ceiling={ceiling} threshold={threshold} showCaption={false} />

      <BudgetHeroFooter action={action} caption={caption} />
    </>
  );
}

export function BudgetHero(props: BudgetHeroProps) {
  return (
    <div className={cn('budget-hero', props.className)}>
      <BudgetHeroBody {...props} />
    </div>
  );
}
