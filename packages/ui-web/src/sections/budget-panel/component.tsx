import React from 'react';

import { BudgetHero } from '../../components/budget-hero';
import { Button } from '../../components/button';
import { Meter } from '../../components/meter';
import { formatMoneyOf } from '../../lib/money';
import { DASHBOARD_LABEL, SECTION_LABEL } from '../dashboard-label';
import type { BudgetPanelProps } from './types';

// Contract: docs/design/console-redesign/README.md §5.1 (overview.svg, dashboard 3) — the BUDGET
// zone: the account hero meter, then two optional blocks separated by `border` rules — NEEDS
// ATTENTION (the project closest to its ceiling, with its refill action) and REFILL REQUESTS (a
// count plus the link into Admin). Both are omitted entirely when their data is absent; neither
// leaves an empty placeholder behind.
export function BudgetPanel({
  label = 'BUDGET — CONSUMPTION VS CEILING',
  budget,
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
        <div className={DASHBOARD_LABEL}>{label}</div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      <div className="mt-4">
        <BudgetHero
          value={budget.value}
          ceiling={budget.ceiling}
          threshold={budget.threshold}
          caption={budget.caption}
        />

        {needsAttentionProject ? (
          <>
            <div aria-hidden="true" className="my-5 border-t border-border" />
            <div className={SECTION_LABEL}>NEEDS ATTENTION</div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs text-ink">{needsAttentionProject.name}</span>
              <span className="font-mono text-[11px] text-soft">
                {formatMoneyOf(needsAttentionProject.value, needsAttentionProject.ceiling)}
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
              <span className="font-sans text-[10px] text-subtle">
                {needsAttentionProject.caption}
              </span>
            </div>
          </>
        ) : null}

        {refillRequestStatus ? (
          <>
            <div aria-hidden="true" className="my-5 border-t border-border" />
            <div className={SECTION_LABEL}>REFILL REQUESTS</div>
            <p className="mt-3 font-mono text-[11px] text-soft">
              {refillRequestStatus.pendingCount} pending · {refillRequestStatus.submittedLabel}
            </p>
            <button
              type="button"
              onClick={onReviewInAdmin}
              className="mt-1 font-mono text-[11px] text-soft underline-offset-2 hover:text-ink hover:underline">
              Review in Admin →
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
