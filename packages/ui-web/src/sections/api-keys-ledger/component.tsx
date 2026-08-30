import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { RowActionGroup } from '../../components/row-action-group';
import { SecretReveal } from '../../components/secret-reveal';
import { StatusText } from '../../components/status-text';
import { TypedConfirmDialog } from '../../components/typed-confirm-dialog';
import type { ApiKeyRow, ApiKeysLedgerProps } from './types';

const statusTone = (status: ApiKeyRow['status']): 'active' | 'muted' | 'attention' =>
  status === 'active' ? 'active' : status === 'expiring' ? 'attention' : 'muted';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — the centre zone of the
// Api-Keys screen: the one-time secret strip (present only right after a create or rotate), the
// key ledger (with its compact-tier FILTERS trigger and per-row actions), and the pager, all
// meant to sit inside ONE `Card` (`api-keys-centre.tsx` supplies it). The revoke and delete gates
// — a `TypedConfirmDialog` retargeted to one row each — belong to this zone too, since they are
// the row actions that open them.
//
// 2026-08-30 revamp brief: `statusSummary` is gone — it duplicated `ApiKeysHygieneNotes`, which
// mounts above this section in `api-keys-centre.tsx` and stays the ONE status line. A genuine
// empty collection now renders `emptyState` (an `EmptyState` with a `+ New key` CTA) in place of
// the table outright, same "no shape left to teach" call `ProjectsLedger` makes.
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
  emptyState,
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
  sort,
  onSortChange,
  pagination,
  toolbarActions,
  className,
}: ApiKeysLedgerProps) {
  const columns: LedgerColumn<ApiKeyRow>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '220px',
      accessor: (row) => <span className="text-ink">{row.name}</span>,
    },
    { key: 'prefix', header: 'Prefix', width: '160px', kind: 'data', accessor: (row) => row.prefix },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      accessor: (row) => <StatusText tone={statusTone(row.status)}>{row.statusLabel}</StatusText>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '110px',
      align: 'right',
      sortable: true,
      kind: 'data',
      accessor: (row) => row.created,
    },
    {
      key: 'lastUsed',
      header: 'Last used',
      width: '120px',
      align: 'right',
      sortable: true,
      kind: 'data',
      accessor: (row) => row.lastUsed,
    },
    {
      key: 'expires',
      header: 'Expires',
      width: '110px',
      align: 'right',
      sortable: true,
      kind: 'data',
      accessor: (row) => row.expires,
    },
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

      {error ? (
        // Ahead of the table toolbar's own compact-tier trigger — a genuine fetch failure takes
        // the whole row.
        <ErrorLine message={error} onRetry={onRetry} />
      ) : isEmpty && emptyState ? (
        // A true empty collection replaces the table outright, same "no shape left to teach" call
        // `ProjectsLedger` makes for its own empty collection.
        emptyState
      ) : (
        <>
          {toolbarActions ? <div className="flex justify-end">{toolbarActions}</div> : null}

          <LedgerTable
            columns={columns}
            data={keys}
            rowKey={(row) => row.id}
            loading={loading}
            loadingRowCount={loadingRowCount}
            selectedRowKeys={selectedRowKeys}
            onSelectRow={onSelectRow}
            sort={sort}
            onSortChange={onSortChange}
            renderRowActions={(row) => (
              <RowActionGroup
                aria-label={`${row.name} actions`}
                actions={[
                  {
                    key: 'rotate',
                    label: 'Rotate',
                    onClick: () => onRotate(row),
                    emphasis: 'default',
                  },
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
                          label: 'Delete',
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
            <Pagination
              shown={pagination.shown}
              total={pagination.total}
              unit="keys"
              hasPrev={pagination.hasPrev ?? false}
              hasNext={pagination.hasNext ?? false}
              onPrev={pagination.onPrev}
              onNext={pagination.onNext}
            />
          ) : null}
        </>
      )}

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
