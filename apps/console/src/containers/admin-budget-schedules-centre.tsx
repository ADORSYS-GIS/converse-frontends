'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LedgerTable } from '@lightbridge/ui-web/src/components/ledger-table';
import type { LedgerColumn } from '@lightbridge/ui-web/src/components/ledger-table';
import { RowActionGroup } from '@lightbridge/ui-web/src/components/row-action-group';
import { Toggle } from '@lightbridge/ui-web/src/components/toggle';
import { TypedConfirmDialog } from '@lightbridge/ui-web/src/components/typed-confirm-dialog';
import { RESET_SCHEDULE_ENFORCEMENT_CAPTION } from '@lightbridge/ui-web/src/lib/reset-schedule';
import { BudgetSchedulePreview } from '@lightbridge/ui-web/src/sections/budget-schedule-preview';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import Link from 'next/link';
import React from 'react';

import { useTranslation } from '../i18n/client';
import type { BudgetScheduleRow } from './budget-schedule-rows';
import { BudgetScheduleFormView } from './budget-schedule-form-view';
import { useBudgetScheduleFormScreen } from './use-budget-schedule-form-screen';
import { useAdminBudgetSchedulesScreen } from './use-admin-budget-schedules-screen';

/**
 * `/admin/budget-schedules` — the standing rules that write budget grants on a cadence
 * (converse-frontends#451, story C8; backend ADR-0032, lightbridge-authz#653).
 *
 * Mode-split by nuqs params, the SAME shape `/admin/refill-policies` uses: the bare path lists,
 * `?edit=<id>` opens the form on a stored schedule, `?preview=<id>` opens the dry-run sheet,
 * `?delete=<id>` opens the typed confirmation. `create` is its own route segment
 * (`/admin/budget-schedules/create`), matching the owner's round-2 ruling on the refill-policy
 * route rather than re-litigating it here.
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`.
 *
 * ── THE CAPTION IS NOT DECORATION ───────────────────────────────────────────────────────────
 * `RESET_SCHEDULE_ENFORCEMENT_CAPTION` sits directly under the page title because an operator
 * reading "reset" as "lifts my rate limit" is WRONG:
 * `lightbridge-authz/docs/governance-model-and-enforcement.md:540-551` records that the ledger is
 * not wired to per-request enforcement at all — live 429s come from Envoy plan buckets keyed on
 * Authorino-stamped headers. A schedule changes the balance this console shows and the `budget_tier`
 * claim minted at token time, and nothing a request experiences at the gateway, until Phase 6a
 * lands. Nothing else on this screen would tell them that.
 *
 * ── DELETE IS A TYPED CONFIRMATION, RUN NOW IS A SECOND ONE ─────────────────────────────────
 * Delete removes a STANDING RULE — the future, not the past (the grants it already wrote stay in
 * the append-only ledger forever), and nothing on this screen would show the operator what they
 * had before. That earns `TypedConfirmDialog`, the same treatment key revocation gets. "Run now"
 * is gated differently and just as deliberately: it is only reachable from inside the preview
 * sheet, and only once a DRY run has actually come back, so an estate-wide grant can never be
 * fired off a button pressed before seeing what it would do.
 */
export function AdminBudgetSchedulesCentre() {
  const screen = useAdminBudgetSchedulesScreen();

  if (screen.mode === 'edit' && screen.editScheduleId) {
    return <BudgetScheduleEditView scheduleId={screen.editScheduleId} />;
  }
  return <BudgetSchedulesListView screen={screen} />;
}

/** `?edit=<id>` — the same form the create route renders, fed by the same hook with an id. */
function BudgetScheduleEditView({ scheduleId }: { scheduleId: string }) {
  const form = useBudgetScheduleFormScreen(scheduleId);
  return <BudgetScheduleFormView form={form} />;
}

function BudgetSchedulesListView({
  screen,
}: {
  screen: ReturnType<typeof useAdminBudgetSchedulesScreen>;
}) {
  const { t } = useTranslation('admin');
  // `console-table` is `min-width: max-content` by contract — the ledger keeps its natural width
  // and scrolls inside its own box rather than wrapping cells (theme.css's own note). The cadence
  // SENTENCE is therefore the column that sets this table's width, and it is the one column that
  // has earned the room: it is what the screen is for. Every other track is pinned to what its
  // content actually needs — a name, a short scope phrase, two relative timestamps, a switch — so
  // the enabled toggle and the row actions stay on screen without a scroll at ordinary console
  // widths, rather than being pushed off by generous tracks nothing fills.
  const columns: LedgerColumn<BudgetScheduleRow>[] = [
    {
      key: 'name',
      header: t('budget-schedules.column.name'),
      accessor: (row) => row.name,
      width: '150px',
    },
    {
      key: 'scope',
      header: t('budget-schedules.column.scope'),
      accessor: (row) => row.scope,
      width: '140px',
    },
    // The whole schedule as one sentence — six enum columns is a table nobody can read.
    {
      key: 'cadence',
      header: t('budget-schedules.column.cadence'),
      accessor: (row) => row.cadence,
    },
    {
      // Wider than 'Last run' beside it: a forced window's cell carries "· forced" as well as the
      // relative time, and wrapping that onto two lines would make one row taller than every other.
      key: 'nextRun',
      header: t('budget-schedules.column.next-run'),
      accessor: (row) => row.nextRun,
      kind: 'data',
      width: '140px',
    },
    {
      key: 'lastRun',
      header: t('budget-schedules.column.last-run'),
      accessor: (row) => row.lastRun,
      kind: 'data',
      width: '96px',
    },
    {
      key: 'enabled',
      header: t('budget-schedules.column.enabled'),
      width: '72px',
      accessor: (row) => (
        <Toggle
          checked={row.enabled}
          onCheckedChange={(enabled) => screen.onToggleEnabled(row.id, enabled)}
          aria-label={t('budget-schedules.row.enabled-label', { name: row.name })}
        />
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t('budget-schedules.title')}
          subtitle={RESET_SCHEDULE_ENFORCEMENT_CAPTION}
          action={
            <Button
              type="button"
              variant="primary"
              size="sm"
              nativeButton={false}
              render={<Link href="/admin/budget-schedules/create" />}>
              {t('budget-schedules.new-schedule')}
            </Button>
          }
        />

        <Card>
          {screen.status === 'error' ? (
            <ErrorLine
              message={screen.errorMessage ?? t('budget-schedules.load-failed')}
              onRetry={screen.onRetry}
            />
          ) : (
            <>
              {/* An inline status line, never a centred placard — the table header above it stays
                  rendered (console-ui skill, "empty states"). */}
              {screen.status === 'ready' && screen.rows.length === 0 ? (
                <InlineStatus>{screen.emptyMessage}</InlineStatus>
              ) : null}

              {screen.toggleErrorMessage ? (
                <ErrorLine message={screen.toggleErrorMessage} className="mb-3" />
              ) : null}

              <LedgerTable
                columns={columns}
                data={screen.rows}
                rowKey={(row) => row.id}
                loading={screen.status === 'loading'}
                loadingRowCount={4}
                renderRowActions={(row) => (
                  <RowActionGroup
                    aria-label={t('budget-schedules.row.actions-label', { name: row.name })}
                    actions={[
                      {
                        key: 'edit',
                        label: t('budget-schedules.row.edit'),
                        onClick: () => screen.onEdit(row.id),
                      },
                      {
                        key: 'preview',
                        // One word, like every other row action in this console ("Edit", "Del",
                        // "Revoke"): the actions track is a fixed 136px and "Preview run" wrapped
                        // to two lines inside it. The sheet it opens is titled "Preview — <name>"
                        // and leads with what a dry run does, so nothing is lost by the shorter
                        // label.
                        label: t('budget-schedules.row.preview'),
                        emphasis: 'strong',
                        onClick: () => screen.onPreview(row.id),
                      },
                      {
                        key: 'delete',
                        label: t('budget-schedules.row.delete'),
                        emphasis: 'muted',
                        onClick: () => screen.onRequestDelete(row.id),
                      },
                    ]}
                  />
                )}
              />
            </>
          )}
        </Card>
      </div>

      <BottomSheet
        open={screen.preview.scheduleId !== null}
        onOpenChange={(open) => {
          if (!open) screen.preview.onClose();
        }}
        title={screen.preview.title}
        subtitle={screen.preview.subtitle}
        footer={
          // The second confirmation. Disabled until a dry run has actually returned — see the
          // container's own doc comment.
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!screen.preview.canRunForReal}
            onClick={screen.preview.onRunForReal}>
            {screen.preview.runningForReal
              ? t('budget-schedules.preview.running')
              : t('budget-schedules.preview.run-for-real')}
          </Button>
        }>
        <BudgetSchedulePreview
          status={screen.preview.status}
          timing={screen.preview.timing}
          dryRun={screen.preview.dryRun}
          windowLabel={screen.preview.windowLabel}
          entries={screen.preview.entries}
          totalEntryCount={screen.preview.totalEntryCount}
          entryLimit={screen.preview.entryLimit}
          deferredCount={screen.preview.deferredCount}
          supersededCount={screen.preview.supersededCount}
          errorMessage={screen.preview.errorMessage}
          onRetry={screen.preview.onRetry}
        />
      </BottomSheet>

      {screen.deleteTarget ? (
        <TypedConfirmDialog
          open
          title={t('budget-schedules.delete.title', { name: screen.deleteTarget.name })}
          description={t('budget-schedules.delete.description')}
          objectName={screen.deleteTarget.name}
          confirmLabel={
            screen.deleting
              ? t('budget-schedules.delete.deleting')
              : t('budget-schedules.delete.confirm')
          }
          error={screen.deleteErrorMessage}
          onConfirm={screen.onConfirmDelete}
          onCancel={screen.onCancelDelete}
        />
      ) : null}
    </>
  );
}
