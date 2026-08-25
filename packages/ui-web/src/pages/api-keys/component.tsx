import React, { useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ConsoleShell } from '../../components/console-shell';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { fieldLabelClassName } from '../../components/field/cva';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { RailPanel } from '../../components/rail-panel';
import { RowActionGroup } from '../../components/row-action-group';
import { ScopeSelect } from '../../components/scope-select';
import { SecretReveal } from '../../components/secret-reveal';
import { SectionSheet } from '../../components/section-sheet';
import { SegmentedControl } from '../../components/segmented-control';
import { StatusText } from '../../components/status-text';
import { TypedConfirmDialog } from '../../components/typed-confirm-dialog';
import type { ApiKeyRow, ApiKeysPageProps } from './types';

const statusTone = (status: ApiKeyRow['status']): 'active' | 'muted' | 'attention' =>
  status === 'active' ? 'active' : status === 'expiring' ? 'attention' : 'muted';

// Compact-tier (below `lg`) contextual sheet triggers — console-ui skill "Shape and layout"
// (owner revision 2026-08-25). KEY HYGIENE and LIFECYCLE deliberately get no trigger of their
// own: both are read-only, non-parameterising rail content (hygiene counts already echo the
// per-row STATUS column; lifecycle is static help copy), unlike New key/Scope/Filters which are
// either the primary action or genuinely alter what the ledger shows.
function ScopeIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <circle cx="6" cy="6" r="4.3" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1.5 2h9M3.5 6h5M5 10h2" strokeLinecap="round" />
    </svg>
  );
}

function SectionTriggerButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onClick} className="lg:hidden">
      {icon}
    </Button>
  );
}

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — pure page view, all data
// via typed props (console-ui skill "Page views"). ConsoleShell composition: left rail = nav +
// left-rail SCOPE echo; centre = title, optional SecretReveal strip, InlineStatus, key ledger;
// right rail = New key CTA + SCOPE (interactive) + FILTERS + KEY HYGIENE + LIFECYCLE help.
export function ApiKeysPage({
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

  // Compact-tier (below `lg`) sheet state — the page owns this now, not `ConsoleShell` (owner
  // revision 2026-08-25, console-ui skill "Shape and layout").
  const [scopeSheetOpen, setScopeSheetOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  // Section content, factored out so each renders twice: once inline inside a `RailPanel` (the
  // persistent `lg` rail) and once bare inside a `SectionSheet` (the compact-tier trigger
  // target — `SectionSheet`'s own header already supplies the heading).
  const scopeFields = <ScopeSelect {...scopeSelect} />;

  const filterFields = (
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
  );

  return (
    <ConsoleShell
      header={header}
      nav={nav}
      className={className}
      leftSecondary={
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
      }
      leftSecondaryLabel="Scope"
      rightRail={
        // A Fragment, not a wrapping `<div>`: the rail column in `ConsoleShell` applies
        // `bg-surface divide-y divide-raised` to its direct children, so each `RailPanel`
        // section here must render as a direct DOM child of that column for the hairline
        // separators to land between sections instead of around one wrapping box (console-ui
        // skill "Rails are flush, aligned, full-height columns", owner revision 2026-08-25).
        // Only rendered inline at `lg` — below that, New key moves into the title row and
        // SCOPE/FILTERS are reachable via their own contextual triggers.
        <>
          <RailPanel>
            <Button type="button" variant="primary" className="w-full" onClick={onCreateKey}>
              + New key
            </Button>
          </RailPanel>
          <RailPanel label="SCOPE">{scopeFields}</RailPanel>
          <RailPanel label="FILTERS">{filterFields}</RailPanel>
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
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-mono text-[22px] leading-[1.25] text-ink">Api-Keys</h1>
            <div className="mt-1 flex items-center gap-1.5">
              <p className="font-sans text-[11px] text-subtle">
                {scope.accountLabel} / {scope.projectLabel}
              </p>
              <SectionTriggerButton label="Open scope" icon={<ScopeIcon />} onClick={() => setScopeSheetOpen(true)} />
            </div>
          </div>
          {/* New key stays a visible primary in the title row below `lg` — the rail's own copy
              (above) covers `lg`, so this one is hidden there rather than duplicating the CTA. */}
          <Button type="button" variant="primary" onClick={onCreateKey} className="lg:hidden">
            + New key
          </Button>
        </div>

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
              <InlineStatus>{emptyMessage ?? 'No keys in this project yet. Create one from the right.'}</InlineStatus>
            ) : statusSummary ? (
              <InlineStatus>{statusSummary}</InlineStatus>
            ) : null}
          </div>
          <SectionTriggerButton label="Open filters" icon={<FilterIcon />} onClick={() => setFiltersSheetOpen(true)} />
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

      <SectionSheet open={scopeSheetOpen} onOpenChange={setScopeSheetOpen} label="SCOPE">
        {scopeFields}
      </SectionSheet>
      <SectionSheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen} label="FILTERS">
        {filterFields}
      </SectionSheet>
    </ConsoleShell>
  );
}
