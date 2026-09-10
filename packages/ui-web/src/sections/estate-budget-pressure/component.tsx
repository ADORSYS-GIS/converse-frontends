import React from 'react';

import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { Meter } from '../../components/meter';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { formatUsdOf } from '../../lib/money';
import { DATA_CLASS, META_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { EstateBudgetPressureProps } from './types';

// Contract: the operator overview's budget-pressure zone (admin-overview design batch, dashboard
// 4) — which ACCOUNTS are nearest their own ceiling, estate-wide. `BudgetPressure` (single sister
// section) measures projects against the one ceiling their shared account carries; there is no
// such shared figure here — every account genuinely has its own ceiling, so this section sorts by
// CONSUMPTION RATIO rather than raw spend: a $40 account sitting at 95% of a $50 ceiling belongs
// above a $2,000 account at 40% of a $5,000 one.
//
// Same shrink policy as `BudgetPressure`: no upstream for a ranked meter list (daisy `progress` is
// rejected — PRIMITIVES.md), so the row geometry, tone and skeletons are the only local paint.
const STACK_CLASS = 'mt-4 flex flex-col gap-4';
const ROW_HEAD_CLASS = `${INLINE_ROW_CLASS} justify-between`;
const NAME_CLASS = SECTION_TITLE_CLASS;

export function EstateBudgetPressure({
  label = 'Budget pressure — nearest their own ceiling',
  accounts,
  threshold,
  status = 'ready',
  errorMessage,
  onRetry,
  emptyMessage,
  loadingRowCount = 4,
  className,
}: EstateBudgetPressureProps) {
  // Ranked here, not by the caller — the rank IS the section's message, and it is a ratio the
  // caller would otherwise have to recompute identically (`BudgetPressure`'s own rationale, one
  // axis over).
  const ranked = [...accounts].sort((a, b) => {
    const ratioA = a.ceiling > 0 ? a.spend / a.ceiling : 0;
    const ratioB = b.ceiling > 0 ? b.spend / b.ceiling : 0;
    return ratioB - ratioA;
  });

  return (
    <div className={className}>
      <div className={SECTION_TITLE_CLASS}>{label}</div>

      <div className={STACK_CLASS}>
        {status === 'error' ? (
          <ErrorLine
            message={errorMessage ?? 'Failed to load budget pressure.'}
            onRetry={onRetry}
          />
        ) : status === 'loading' ? (
          Array.from({ length: loadingRowCount }, (_, row) => (
            <div key={row} role="presentation" aria-hidden="true">
              <div className="skeleton h-3 w-40" />
              <div className="skeleton mt-2 h-1 w-full" />
            </div>
          ))
        ) : ranked.length === 0 ? (
          <InlineStatus>
            {emptyMessage ?? 'No account drew on its ceiling this period.'}
          </InlineStatus>
        ) : (
          ranked.map((account) => (
            <div key={account.key}>
              <div className={ROW_HEAD_CLASS}>
                <span className={NAME_CLASS}>{account.name}</span>
                <span className={DATA_CLASS}>{formatUsdOf(account.spend, account.ceiling)}</span>
              </div>
              <Meter
                className="mt-2"
                value={account.spend}
                ceiling={account.ceiling}
                threshold={threshold}
                showCaption={false}
                label={`${account.name} draw on its own ceiling`}
              />
              {/* The row's own next reset (story C8) — per ROW, not per section: each account
                  resolves its own winning schedule, and two neighbouring rows genuinely can answer
                  differently. Omitted only while the read is still in flight; a resolved "none" is
                  a stated line, worded by the caller. */}
              {account.nextReset ? <p className={META_CLASS}>{account.nextReset}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
