import React from 'react';

import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatUsd } from '../../lib/money';
import { FORCED_WINDOW_MARKER } from '../../lib/reset-schedule';
import { LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import type {
  BudgetSchedulePreviewEntry,
  BudgetSchedulePreviewProps,
  BudgetScheduleTiming,
} from './types';

/**
 * What a budget reset schedule would do, before it does it (converse-frontends#451, story C8).
 *
 * `runBudgetResetScheduleNow { dryRun: true }` and the real tick are literally the same code path
 * with one boolean flipped (`authz.cstack`'s own note on the procedure), so this list is not an
 * estimate — it is the plan. That is worth stating on screen, and the copy does.
 *
 * The three counts a reader needs, and why each is here rather than folded into the table:
 *  - **entries** — the accounts that would get a ledger row. The table.
 *  - **deferred** — accounts whose spend came back `Unavailable`. NO grant is written for them and
 *    the window stays due, so the next tick retries. They are not failures and they are not
 *    silently skipped; they are a count with a sentence.
 *  - **superseded** — accounts this schedule matches but a MORE SPECIFIC enabled schedule covers
 *    (account > billing_plan > global). Precedence is the backend's answer, never recomputed here.
 *
 * The 25-row cap is a UI convention, not a wire limit — the RPC returns the whole plan. Whenever it
 * actually drops rows the caption says how many, because "the first 25 of 137" and "all 19" are
 * completely different things for an operator about to press Run now.
 */

/**
 * How many rows a preview shows. A UI CONVENTION, not a wire limit — the RPC returns the whole
 * plan, and the caption below states the real total whenever this cap actually dropped rows
 * (story C8's own assumption, verbatim: "Preview's 25-account cap is a UI convention; the dry-run
 * RPC may return more and the UI truncates with an explicit caption").
 */
export const PREVIEW_ENTRY_LIMIT = 25;

const ZERO_ENTRY_LINE =
  'No account would change. A schedule drops an account that is already exactly on target rather ' +
  'than writing a no-op ledger row.';

const DRY_RUN_LINE =
  'Dry run — nothing was written: no grant, no next-run advance, no last-run stamp.';

const REAL_RUN_LINE =
  'Written to the ledger. These grants are permanent — the ledger is append-only.';

/** A signed amount: `+$2.00` / `-$3.40`. `formatUsd` already signs a negative; the plus is added so
 *  a grant and a clamp-down never differ only by a character that is easy to miss. */
function signedUsd(amount: number): string {
  return amount > 0 ? `+${formatUsd(amount)}` : formatUsd(amount);
}

const COLUMNS: LedgerColumn<BudgetSchedulePreviewEntry>[] = [
  {
    key: 'account',
    header: 'Account',
    accessor: (entry) => entry.accountLabel,
  },
  {
    key: 'remaining',
    header: 'Remaining now',
    align: 'right',
    kind: 'data',
    width: '140px',
    accessor: (entry) => formatUsd(entry.remaining),
  },
  {
    key: 'delta',
    header: 'Change',
    align: 'right',
    kind: 'data',
    width: '140px',
    accessor: (entry) => signedUsd(entry.delta),
  },
];

/**
 * The schedule's own next/last run, above whatever the run status is.
 *
 * Rendered in EVERY status, including `idle` and `error`: it describes the rule, not the dry run,
 * and a sheet that showed it only on success would hide the one fact an operator opening a failed
 * preview most wants — when this thing is going to fire regardless.
 */
function ScheduleTiming({ timing }: { timing: BudgetScheduleTiming }) {
  return (
    <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1">
      <div className="flex gap-2">
        <dt className={LABEL_CLASS}>Next execution</dt>
        <dd className={META_CLASS}>
          {timing.nextRun}
          {timing.nextRunForced ? ` · ${FORCED_WINDOW_MARKER}` : ''}
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className={LABEL_CLASS}>Last run</dt>
        <dd className={META_CLASS}>{timing.lastRun}</dd>
      </div>
    </dl>
  );
}

export function BudgetSchedulePreview({
  status,
  timing,
  dryRun,
  windowLabel,
  entries,
  totalEntryCount,
  entryLimit,
  deferredCount,
  supersededCount,
  errorMessage,
  onRetry,
  className,
}: BudgetSchedulePreviewProps) {
  if (status === 'idle') {
    return (
      <div className={className}>
        {timing ? <ScheduleTiming timing={timing} /> : null}
        <InlineStatus>
          Preview a schedule to see the exact ledger rows its next window would write.
        </InlineStatus>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={className}>
        {timing ? <ScheduleTiming timing={timing} /> : null}
        <ErrorLine message={errorMessage ?? 'The preview run failed.'} onRetry={onRetry} />
      </div>
    );
  }

  const truncated = totalEntryCount > entryLimit;

  return (
    <div className={className}>
      {timing ? <ScheduleTiming timing={timing} /> : null}
      <InlineStatus>{dryRun ? DRY_RUN_LINE : REAL_RUN_LINE}</InlineStatus>

      {windowLabel ? <p className={META_CLASS}>Window starting {windowLabel}.</p> : null}

      {status === 'ready' && entries.length === 0 ? (
        <InlineStatus>{ZERO_ENTRY_LINE}</InlineStatus>
      ) : (
        <LedgerTable
          columns={COLUMNS}
          data={entries}
          rowKey={(entry) => entry.budgetAccountId}
          loading={status === 'loading'}
          loadingRowCount={6}
        />
      )}

      {status === 'ready' ? (
        <p className={META_CLASS}>
          {truncated
            ? `Showing the first ${entryLimit} of ${totalEntryCount} affected accounts.`
            : `${totalEntryCount} affected account${totalEntryCount === 1 ? '' : 's'}.`}
          {deferredCount > 0
            ? ` ${deferredCount} deferred — their spend was unreadable, so nothing is written for them and the window stays due.`
            : ''}
          {supersededCount > 0
            ? ` ${supersededCount} superseded by a more specific schedule, which fires for them instead.`
            : ''}
        </p>
      ) : null}
    </div>
  );
}
