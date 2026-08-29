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
// tier FILTERS trigger), the key ledger with its per-row actions, and the pager. The revoke
// gate — a `TypedConfirmDialog` retargeted to one row — belongs to this zone too, since it is the
// row action that opens it.
//
// Presentational only: every row action is a callback prop, and the dialog's open state is the
// caller's `revokeTarget`, not local state.
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
  onDelete,
  onRequestRevoke,
  revokeTarget,
  onConfirmRevoke,
  onCancelRevoke,
  selectedRowKeys,
  onSelectRow,
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
    { key: 'prefix', header: 'Prefix', width: '160px', accessor: (row) => row.prefix },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      accessor: (row) => <StatusText tone={statusTone(row.status)}>{row.statusLabel}</StatusText>,
    },
    { key: 'created', header: 'Created', width: '110px', align: 'right', accessor: (row) => row.created },
    { key: 'lastUsed', header: 'Last used', width: '120px', align: 'right', accessor: (row) => row.lastUsed },
    { key: 'expires', header: 'Expires', width: '110px', align: 'right', accessor: (row) => row.expires },
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
              {
                key: 'del',
                label: 'Del',
                onClick: () => onDelete(row),
                emphasis: 'muted',
                disabled: row.status === 'revoked',
              },
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
    </div>
  );
}
