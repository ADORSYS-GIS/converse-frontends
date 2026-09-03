import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { StatusText } from '../../components/status-text';
import { IdentityLines, identityDisplay } from '../../lib/identity-lines';
import { META_CLASS } from '../../lib/type-roles';
import type { SessionLedgerProps, SessionLedgerRow, SessionStatus } from './types';

/** Sentence case, once (console-ui skill "sentence case everywhere"). */
const KIND_LABEL: Record<SessionLedgerRow['kind'], string> = {
  browser: 'Browser',
  token: 'Token',
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
};

/**
 * `StatusText`'s three-way tone axis, applied to the session lifecycle.
 *
 * The story asked for a "status pill … semantic colour, not the accent". The console's locked
 * contract is the opposite of a pill — "**Status is text, never a pill**; counts go in tab labels,
 * never badges" (console-ui skill §states, `status-text/cva.ts`'s own NO-UPSTREAM note refusing
 * daisy `status`/`badge`) — so it is text, and the WORD carries the distinction the colour cannot:
 * `revoked` and `expired` are both `muted` (both are simply over), and only the label separates
 * "an operator closed this" from "time ran out". `attention` (`--signal`) is deliberately unused
 * here: it is the accent, which the story itself rules out, and none of these three states is a
 * breach.
 */
const statusTone = (status: SessionStatus): 'active' | 'muted' =>
  status === 'active' ? 'active' : 'muted';

/**
 * `/admin/sessions`' centre: the estate-wide session ledger, its pager, and the two non-blocking
 * status lines above them (converse-frontends#450, story C7).
 *
 * Backed by `querySessions` (lightbridge-authz#649/#657) — NOT `listSessions`, which is impossible
 * in that schema and always was: cratestack emits `handle_list_sessions` for the generic
 * `model.Session.list` verb, so a procedure by that name is a hard codegen collision. The name is
 * the one thing that moved between the story and the shipped surface.
 *
 * Presentational only. Filters live in `PageHeader.controls` (the container's own
 * `SessionLedgerControls`), row detail is a `BottomSheet` the container mounts, and every revoke is
 * a callback — this section neither reads a clock nor holds a target of its own.
 *
 * EMPTY IS AN INLINE LINE, NOT A PLACARD (owner rule, and the D6 split in the design spec §6):
 * this table always has a status/kind/user filter above it, so "no sessions matched" is a fact
 * about those filters, never a first-run state with a shape left to teach. `EmptyState` — the
 * centred headline+explainer — is deliberately not imported here.
 */
export function SessionLedger({
  sessions,
  loading = false,
  loadingRowCount = 8,
  error,
  onRetry,
  status,
  emptyMessage,
  onResetFilters,
  selectedSessionId,
  onSelectSession,
  pagination,
  className,
}: SessionLedgerProps) {
  const columns: LedgerColumn<SessionLedgerRow>[] = [
    {
      key: 'user',
      header: 'User',
      width: '210px',
      // `identityDisplay` turns the row's person-shaped union into the pair `IdentityLines` takes
      // — the same two lines the refill queue's Requester cell renders, via the same component
      // (converse-frontends#448 extracted it exactly so a third surface could not spell it again).
      accessor: (row) => <IdentityLines {...identityDisplay(row.user)} />,
    },
    { key: 'account', header: 'Account', width: '150px', accessor: (row) => row.account },
    {
      key: 'kind',
      header: 'Kind',
      width: '120px',
      // The offline marker rides the Kind cell rather than taking a column of its own: it is a
      // qualifier on what KIND of session this is (a CLI/device login that outlives a browser
      // one), true of a minority of rows, and a whole column of blanks would say less than a
      // trailing word on the rows it applies to. Text, not a chip — the same "never a pill" rule
      // the status column follows; its meaning is stated in the caption under the table.
      accessor: (row) => (
        <span className="flex items-baseline gap-1">
          <span>{KIND_LABEL[row.kind]}</span>
          {row.offline ? <span className={META_CLASS}>· offline</span> : null}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Client (azp)',
      width: '150px',
      kind: 'data',
      // The header names the claim, not just the concept: an operator reading this screen is
      // usually holding a token (or a log line) that spells the same fact `azp`, and "Client"
      // alone left them to guess whether the two were the same field. They are.
      //
      // An absent value is still a real, permitted state — a browser row minted before
      // lightbridge-authz#659 has no recoverable client id — so the cell says so rather than
      // rendering blank.
      accessor: (row) => row.client ?? <span className="text-subtle">None recorded</span>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '120px',
      align: 'right',
      kind: 'data',
      accessor: (row) => row.created,
    },
    {
      key: 'lastUsed',
      header: 'Last used',
      width: '120px',
      align: 'right',
      kind: 'data',
      accessor: (row) => row.lastUsed ?? <span className="text-subtle">Never</span>,
    },
    {
      key: 'expires',
      header: 'Expires',
      width: '120px',
      align: 'right',
      kind: 'data',
      accessor: (row) => row.expires,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      accessor: (row) => (
        <StatusText tone={statusTone(row.status)}>{STATUS_LABEL[row.status]}</StatusText>
      ),
    },
  ];

  const isEmpty = !loading && !error && sessions.length === 0;

  if (error) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <ErrorLine message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Degraded identity resolution, or a user search that matched nobody: a status, not an
          error — the rows below are real and revocable either way (console-ui skill "States"). */}
      {status ? <InlineStatus>{status}</InlineStatus> : null}

      {isEmpty ? (
        <InlineStatus
          action={
            onResetFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={onResetFilters}>
                Reset filters
              </Button>
            ) : undefined
          }>
          {emptyMessage}
        </InlineStatus>
      ) : (
        <>
          <LedgerTable
            columns={columns}
            data={sessions}
            rowKey={(row) => row.id}
            loading={loading}
            loadingRowCount={loadingRowCount}
            selectedRowKeys={selectedSessionId ? [selectedSessionId] : []}
            onSelectRow={onSelectSession}
          />
          <p className={META_CLASS}>
            “Offline” marks a session whose refresh chain carries the <code>offline_access</code>{' '}
            scope — a CLI or device login that outlives a browser session.
          </p>
        </>
      )}

      {/* `Pagination` renders nothing with neither direction wired, so a single page of results
          never grows a pager with nothing to press. */}
      {pagination ? (
        <Pagination
          shown={pagination.shown}
          pageSize={pagination.pageSize}
          unit="sessions"
          hasPrev={pagination.hasPrev}
          hasNext={pagination.hasNext}
          onPrev={pagination.onPrev}
          onNext={pagination.onNext}
        />
      ) : null}
    </div>
  );
}
