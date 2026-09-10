import React from 'react';

import { cn } from '../../cn';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { formatUsd } from '../../lib/money';
import { RequesterLines } from '../../lib/requester-lines';
import type { RefillRequestRow, ReviewQueueProps } from './types';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatUsd(Math.abs(amount))}`;
}

// Admin review revamp (phase 6): the whole of `/admin` now — no Pending/Decided tabs (that
// switch, and the DECIDED side, were built on `listPendingAugmentationRequests`, the one real
// endpoint this screen has, which by its own name and doc comment is a PENDING-only read path;
// there is no dedicated decided-request listing to back a second tab honestly — see the deleted
// `sections/decisions-ledger`'s own doc comment for the fuller history). Four columns: Submitted
// (sortable — the consumer owns the actual order, a URL param per ADR 0011), Project, Account
// (both resolved display names, never raw ids — `use-admin-screen.ts` resolves them the same way
// `use-overview-screen.ts` resolves its own scope labels) and Refill, right-aligned mono. Consumed
// and Ceiling are gone: both were permanently `null` upstream (no consumption query is wired up),
// and a column that can never hold a real value is not a column, it is a promise the screen
// cannot keep.
//
// REQUESTER IS BACK (converse-frontends#444). It was removed because it duplicated the Account
// cell verbatim — the console had no requester, so it printed the account and called it one.
// `AugmentationRequest.requestedByUserId` (lightbridge-authz#646) is now a real, distinct fact,
// resolved to a name+email by ONE batched `resolveUserProfiles` call per page, so the column
// holds something the Account cell cannot: the person to hold the decision against. Every branch
// that is not a resolved identity renders a LABELLED sentinel (`lib/refill-requester.ts`), never
// a blank cell and never a fabricated name.
export function ReviewQueue({
  pending,
  loading = false,
  loadingRowCount = 4,
  error,
  onRetry,
  sort,
  onSortChange,
  selectedRequestId,
  onSelectRequest,
  requesterStatus,
  pagination,
  className,
}: ReviewQueueProps) {
  const columns: LedgerColumn<RefillRequestRow>[] = [
    {
      key: 'submitted',
      header: 'Submitted',
      width: '130px',
      sortable: true,
      kind: 'data',
      accessor: (row) => row.submittedAgo,
    },
    {
      key: 'project',
      header: 'Project',
      width: '160px',
      accessor: (row) => <span className="text-ink">{row.project}</span>,
    },
    { key: 'account', header: 'Account', width: '170px', accessor: (row) => row.account },
    {
      key: 'requester',
      header: 'Requester',
      // Project/Account each gave up 20px to pay for this column rather than pushing Refill —
      // the decision's own number — off the visible width of the narrower `md` centre.
      width: '200px',
      accessor: (row) => <RequesterLines requester={row.requester} />,
    },
    {
      key: 'refill',
      header: 'Refill',
      width: '110px',
      align: 'right',
      kind: 'data',
      accessor: (row) => <span className="text-ink">{signedMoney(row.requestedAmount)}</span>,
    },
  ];

  // A true empty COLLECTION (no filter to blame — this screen has none) replaces the table
  // outright, the same contract `ProjectsLedger.emptyState` uses.
  const isEmpty = !loading && !error && pending.length === 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState
          headline="No requests awaiting a decision"
          explainer="Refill requests submitted by project members appear here."
        />
      ) : (
        <>
          {/* Degraded requester resolution is a status, not an error: the rows below are real and
              decidable, only their names are missing. `InlineStatus` (`role="status"`) rather than
              `ErrorLine` (`role="alert"`, `Retry`) — console-ui skill "States". */}
          {requesterStatus ? <InlineStatus>{requesterStatus}</InlineStatus> : null}
          <LedgerTable
            columns={columns}
            data={pending}
            rowKey={(row) => row.id}
            density="review"
            loading={loading}
            loadingRowCount={loadingRowCount}
            selectedRowKeys={selectedRequestId ? [selectedRequestId] : []}
            onSelectRow={onSelectRequest}
            sort={sort}
            onSortChange={onSortChange}
          />
          <p className="text-subtle font-sans text-[11px]">
            Requests expire after 14 days without a decision.
          </p>
          {/* Never rendered with neither direction wired — `Pagination` itself returns nothing
              in that case, which is what keeps this from becoming the "more exist" caption with
              nothing to click that the decided-tab pager used to be. */}
          {pagination ? (
            <Pagination
              shown={pagination.shown}
              unit="requests"
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={pagination.onPrev}
              onNext={pagination.onNext}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
