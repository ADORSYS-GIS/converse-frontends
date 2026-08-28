import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { RowActionGroup } from '../../components/row-action-group';
import { SecretReveal } from '../../components/secret-reveal';
import { StatusText } from '../../components/status-text';
import { TypedConfirmDialog } from '../../components/typed-confirm-dialog';
import type { ApiKeyRow, ApiKeysLedgerProps } from './types';

const statusTone = (status: ApiKeyRow['status']): 'active' | 'muted' | 'attention' =>
  status === 'active' ? 'active' : status === 'expiring' ? 'attention' : 'muted';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — the centre zone of the
// Api-Keys screen, in the order the mockup stacks it: the one-time secret strip (present only
// right after a create or rotate), the table toolbar (status/empty/error line plus the compact-
// tier FILTERS trigger), the key ledger with its per-row actions, and the pager. The revoke and
// delete gates — a `TypedConfirmDialog` retargeted to one row each — belong to this zone too,
// since they are the row actions that open them.
//
// Delete (ticket #321): the LIFECYCLE rail states delete is "admin only, behind typed
// confirmation" — `Del` now actually is both. `isAdmin` hides the row action entirely for a
// non-admin rather than rendering it disabled with no explanation (the rail's own "admin only"
// copy is the stated reason, console-ui skill §states); this is presentation only, not a
// security boundary (see `isAdmin`'s doc comment in `types.ts`). Delete is no longer disabled for
// `revoked` keys — ADR 0003 states delete is exactly the cleanup step for a key once it is
// revoked or expired, so blocking it there inverted the design.
//
// Presentational only: every row action is a callback prop, and each dialog's open state is the
// caller's `revokeTarget`/`deleteTarget`, not local state.
export function ApiKeysLedger({
  keys,
  loading = false,
  loadingRowCount = 6,
  error,
  onRetry,
  statusSummary,
  emptyMessage,
  secretReveal,
  onDismissSecret,
  onRotate,
  onRequestRevoke,
  revokeTarget,
  onConfirmRevoke,
  onCancelRevoke,
  isAdmin,
  onRequestDelete,
  deleteTarget,
  onConfirmDelete,
  onCancelDelete,
  selectedRowKeys,
  onSelectRow,
  pagination,
  toolbarActions,
  className,
}: ApiKeysLedgerProps) {
  const columns: LedgerColumn<ApiKeyRow>[] = [
    {
      key: 'name',
      header: 'NAME',
      width: '220px',
      accessor: (row) => <span className="text-ink">{row.name}</span>,
    },
    { key: 'prefix', header: 'PREFIX', width: '160px', accessor: (row) => row.prefix },
    {
      key: 'status',
      header: 'STATUS',
      width: '110px',
      accessor: (row) => <StatusText tone={statusTone(row.status)}>{row.statusLabel}</StatusText>,
    },
    { key: 'created', header: 'CREATED', width: '110px', align: 'right', accessor: (row) => row.created },
    { key: 'lastUsed', header: 'LAST USED', width: '120px', align: 'right', accessor: (row) => row.lastUsed },
    { key: 'expires', header: 'EXPIRES', width: '110px', align: 'right', accessor: (row) => row.expires },
  ];

  const isEmpty = !loading && !error && keys.length === 0;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {secretReveal ? (
        <SecretReveal
          heading={secretReveal.heading}
          description={secretReveal.description}
          secret={secretReveal.secret}
          onDismiss={onDismissSecret}
        />
      ) : null}

      {/* Table toolbar row — the FILTERS trigger sits beside the status/error/empty line. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {error ? (
            <ErrorLine message={error} onRetry={onRetry} />
          ) : isEmpty ? (
            <InlineStatus>
              {emptyMessage ?? 'No keys in this project yet. Create one from the right.'}
            </InlineStatus>
          ) : statusSummary ? (
            <InlineStatus>{statusSummary}</InlineStatus>
          ) : null}
        </div>
        {toolbarActions}
      </div>

      <LedgerTable
        columns={columns}
        data={keys}
        rowKey={(row) => row.id}
        loading={loading}
        loadingRowCount={loadingRowCount}
        selectedRowKeys={selectedRowKeys}
        onSelectRow={onSelectRow}
        renderRowActions={(row) => (
          <RowActionGroup
            aria-label={`${row.name} actions`}
            actions={[
              { key: 'rotate', label: 'Rotate', onClick: () => onRotate(row), emphasis: 'default' },
              {
                key: 'revoke',
                label: 'Revoke',
                onClick: () => onRequestRevoke(row),
                emphasis: 'strong',
              },
              // Omitted (not disabled) for a non-admin — see the file-level contract note above.
              ...(isAdmin
                ? [
                    {
                      key: 'del',
                      label: 'Del',
                      onClick: () => onRequestDelete(row),
                      emphasis: 'muted' as const,
                    },
                  ]
                : []),
            ]}
          />
        )}
      />

      {pagination ? (
        <div className="flex items-center justify-between font-mono text-[10px] text-subtle">
          <span>
            {pagination.shown} of {pagination.total} keys
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={pagination.hasPrev === false}
              onClick={pagination.onPrev}
              className="text-subtle transition-colors duration-150 ease-out hover:text-soft disabled:cursor-not-allowed disabled:opacity-60">
              ‹ prev
            </button>
            <button
              type="button"
              disabled={pagination.hasNext === false}
              onClick={pagination.onNext}
              className="text-soft transition-colors duration-150 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-60">
              next ›
            </button>
          </div>
        </div>
      ) : null}

      {revokeTarget ? (
        <TypedConfirmDialog
          open
          title={`Revoke ${revokeTarget.row.name}?`}
          description="The old secret stops working immediately. Revoked keys keep their status, revoked_at and last_used_at for audit; nothing re-enters Active from Revoked."
          objectName={revokeTarget.row.name}
          confirmLabel="Revoke"
          onConfirm={() => onConfirmRevoke(revokeTarget.row)}
          onCancel={onCancelRevoke}
          error={revokeTarget.error}
        />
      ) : null}

      {deleteTarget ? (
        <TypedConfirmDialog
          open
          title={`Delete ${deleteTarget.row.name}?`}
          description="This permanently removes the key record and its audit trail — status, revoked_at and last_used_at. This cannot be undone. Rotate or Revoke instead if you only need to stop it working."
          objectName={deleteTarget.row.name}
          confirmLabel="Delete"
          onConfirm={() => onConfirmDelete(deleteTarget.row)}
          onCancel={onCancelDelete}
          error={deleteTarget.error}
        />
      ) : null}
    </div>
  );
}
