import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ConsoleShell } from '../../components/console-shell';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { fieldLabelClassName } from '../../components/field/cva';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { NavSpine } from '../../components/nav-spine';
import { RailPanel } from '../../components/rail-panel';
import { RowActionGroup } from '../../components/row-action-group';
import { ScopeSelect } from '../../components/scope-select';
import { SecretReveal } from '../../components/secret-reveal';
import { SegmentedControl } from '../../components/segmented-control';
import { StatusText } from '../../components/status-text';
import { TypedConfirmDialog } from '../../components/typed-confirm-dialog';
import type { ApiKeyRow, ApiKeysPageProps } from './types';

const statusTone = (status: ApiKeyRow['status']): 'active' | 'muted' | 'attention' =>
  status === 'active' ? 'active' : status === 'expiring' ? 'attention' : 'muted';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — pure page view, all data
// via typed props (console-ui skill "Page views"). ConsoleShell composition: left rail = nav +
// left-rail SCOPE echo; centre = title, optional SecretReveal strip, InlineStatus, key ledger;
// right rail = New key CTA + SCOPE (interactive) + FILTERS + KEY HYGIENE + LIFECYCLE help.
export function ApiKeysPage({
  tier,
  header,
  nav,
  scope,
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
  onCreateKey,
  selectedRowKeys,
  onSelectRow,
  pagination,
  scopeSelect,
  statusFilterOptions,
  statusFilterValue,
  onStatusFilterChange,
  search,
  onSearchChange,
  hygiene,
  className,
}: ApiKeysPageProps) {
  const columns: LedgerColumn<ApiKeyRow>[] = [
    { key: 'name', header: 'NAME', width: '220px', accessor: (row) => <span className="text-ink">{row.name}</span> },
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
    <ConsoleShell
      tier={tier}
      header={header}
      className={className}
      leftRail={
        <>
          <RailPanel>
            <NavSpine {...nav} />
          </RailPanel>
          <RailPanel label="SCOPE">
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-mono text-[10px] text-subtle">Account</div>
                <div className="font-mono text-xs text-ink">{scope.accountLabel}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-subtle">Project</div>
                <div className="font-mono text-xs text-ink">{scope.projectLabel}</div>
              </div>
            </div>
          </RailPanel>
        </>
      }
      rightRail={
        <div className="flex flex-col gap-3">
          <RailPanel>
            <Button type="button" variant="primary" className="w-full" onClick={onCreateKey}>
              + New key
            </Button>
          </RailPanel>
          <RailPanel label="SCOPE">
            <ScopeSelect {...scopeSelect} />
          </RailPanel>
          <RailPanel label="FILTERS">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className={fieldLabelClassName}>Status</span>
                <SegmentedControl
                  aria-label="Status filter"
                  options={statusFilterOptions}
                  value={statusFilterValue}
                  onChange={onStatusFilterChange}
                />
              </div>
              <Field
                label="Search"
                placeholder="name or prefix…"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </RailPanel>
          <RailPanel label="KEY HYGIENE">
            <div className="flex flex-col gap-2">
              {hygiene.expiringCount > 0 ? (
                <p className="font-mono text-[11px] text-primary">
                  {hygiene.expiringCount} key{hygiene.expiringCount === 1 ? '' : 's'} expires in{' '}
                  {hygiene.expiringInDays} days
                </p>
              ) : null}
              {hygiene.neverUsedCount > 0 ? (
                <p className="font-mono text-[11px] text-soft">
                  {hygiene.neverUsedCount} key{hygiene.neverUsedCount === 1 ? '' : 's'} never used since creation
                </p>
              ) : null}
              {hygiene.revokedRetainedCount > 0 ? (
                <p className="font-mono text-[11px] text-subtle">
                  {hygiene.revokedRetainedCount} revoked key{hygiene.revokedRetainedCount === 1 ? '' : 's'} retained
                  for audit
                </p>
              ) : null}
            </div>
          </RailPanel>
          <RailPanel label="LIFECYCLE">
            <p className="font-sans text-[10px] leading-[1.45] text-subtle">
              Revoke disables a key and keeps its history. Delete removes the record and its audit
              trail — admin only, behind typed confirmation.
            </p>
          </RailPanel>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-mono text-[22px] leading-[1.25] text-ink">Api-Keys</h1>
          <p className="font-sans text-[11px] text-subtle">
            {scope.accountLabel} / {scope.projectLabel}
          </p>
        </div>

        {secretReveal ? (
          <SecretReveal
            heading={secretReveal.heading}
            description={secretReveal.description}
            secret={secretReveal.secret}
            onDismiss={onDismissSecret}
          />
        ) : null}

        {error ? (
          <ErrorLine message={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <InlineStatus>{emptyMessage ?? 'No keys in this project yet. Create one from the right.'}</InlineStatus>
        ) : statusSummary ? (
          <InlineStatus>{statusSummary}</InlineStatus>
        ) : null}

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
                { key: 'revoke', label: 'Revoke', onClick: () => onRequestRevoke(row), emphasis: 'strong' },
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
          <div className={cn('flex items-center justify-between font-mono text-[10px] text-subtle')}>
            <span>
              {pagination.shown} of {pagination.total} keys
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={pagination.hasPrev === false}
                onClick={pagination.onPrev}
                className="text-subtle transition-colors duration-150 ease-out hover:text-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                ‹ prev
              </button>
              <button
                type="button"
                disabled={pagination.hasNext === false}
                onClick={pagination.onNext}
                className="text-soft transition-colors duration-150 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                next ›
              </button>
            </div>
          </div>
        ) : null}
      </div>

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
    </ConsoleShell>
  );
}
