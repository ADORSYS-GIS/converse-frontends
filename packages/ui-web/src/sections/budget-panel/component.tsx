import React from 'react';

import { BudgetHero } from '../../components/budget-hero';
import { Button } from '../../components/button';
import { Meter } from '../../components/meter';
import { formatUsdOf } from '../../lib/money';
import { DASHBOARD_LABEL_CLASS, LABEL_CLASS } from '../../lib/type-roles';
import type { BudgetPanelProps } from './types';

// Contract: docs/design/console-redesign/README.md §5.1 (overview.svg, dashboard 3) — the BUDGET
// zone: the account hero meter, then two optional blocks separated by `border` rules — NEEDS
// ATTENTION (the project closest to its ceiling, with its refill action) and REFILL REQUESTS (a
// count plus the link into Admin). Both are omitted entirely when their data is absent; neither
// leaves an empty placeholder behind.
export function BudgetPanel({
  label = 'Budget — consumption vs ceiling',
  budget,
  heroAction,
  needsAttentionProject,
  onRequestRefill,
  refillRequestStatus,
  onReviewInAdmin,
  actions,
  className,
}: BudgetPanelProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className={DASHBOARD_LABEL_CLASS}>{label}</div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      <div className="mt-4">
        {budget.status === 'unwired' ? (
          <BudgetHero status="unwired" caption={budget.caption} />
        ) : budget.status === 'loading' ? (
          <BudgetHero status="loading" />
        ) : budget.status === 'error' ? (
          <BudgetHero status="error" errorMessage={budget.errorMessage} onRetry={budget.onRetry} />
        ) : (
          <BudgetHero
            value={budget.value}
            ceiling={budget.ceiling}
            threshold={budget.threshold}
            caption={budget.caption}
            action={heroAction}
          />
        )}

        {needsAttentionProject ? (
          <>
            <div aria-hidden="true" className="border-border my-5 border-t" />
            <div className={LABEL_CLASS}>Needs attention</div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-ink font-mono text-xs">{needsAttentionProject.name}</span>
              <span className="text-soft font-mono text-[11px]">
                {formatUsdOf(needsAttentionProject.value, needsAttentionProject.ceiling)}
              </span>
            </div>
            <div className="mt-2">
              <Meter
                value={needsAttentionProject.value}
                ceiling={needsAttentionProject.ceiling}
                threshold={needsAttentionProject.threshold}
                showCaption={false}
                label={`${needsAttentionProject.name} consumption`}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" size="sm" onClick={onRequestRefill}>
                {needsAttentionProject.refillActionLabel ?? 'Request refill'}
              </Button>
              <span className="text-subtle font-sans text-[10px]">
                {needsAttentionProject.caption}
              </span>
            </div>
          </>
        ) : null}

        {refillRequestStatus ? (
          <>
            <div aria-hidden="true" className="border-border my-5 border-t" />
            <div className={LABEL_CLASS}>Refill requests</div>
            <p className="text-soft mt-3 font-mono text-[11px]">
              {refillRequestStatus.pendingCount} pending · {refillRequestStatus.submittedLabel}
            </p>
            <button
              type="button"
              onClick={onReviewInAdmin}
              className="text-soft hover:text-ink mt-1 font-mono text-[11px] underline-offset-2 hover:underline">
              Review in Admin →
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
