// Page-level acceptance story for `/admin/budget-schedules` (converse-frontends#451, story C8;
// backend ADR-0032, lightbridge-authz#653).
//
// Three views, one per real mode on this route — the same mode split `/admin/refill-policies` uses
// (`create` is its own route segment, not a mode):
//  - LIST — the ledger of standing rules, each rendered as one SENTENCE rather than six enum
//    columns, with the enabled toggle, the row actions, and the honesty caption under the title.
//  - PREVIEW — the dry-run sheet, reached from a row's "Preview" action. Its "Run now, for
//    real" button is the SECOND confirmation and is disabled until a dry run has come back.
//  - DELETE — the typed confirmation, because deleting a standing rule removes the future and
//    nothing on this screen would show the operator what they had.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from '../components/bottom-sheet';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { InlineStatus } from '../components/inline-status';
import { LedgerTable } from '../components/ledger-table';
import type { LedgerColumn } from '../components/ledger-table';
import { RowActionGroup } from '../components/row-action-group';
import { Toggle } from '../components/toggle';
import { TypedConfirmDialog } from '../components/typed-confirm-dialog';
import { RESET_SCHEDULE_ENFORCEMENT_CAPTION } from '../lib/reset-schedule';
import { BudgetSchedulePreview, PREVIEW_ENTRY_LIMIT } from '../sections/budget-schedule-preview';
import { budgetSchedulePreviewEntries } from '../sections/budget-schedule-preview/fixtures';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface ScheduleRow {
  id: string;
  name: string;
  scope: string;
  cadence: string;
  nextRun: string;
  lastRun: string;
  enabled: boolean;
}

// The four schedules a real estate ends up with: a global daily reset, a plan-scoped weekly top-up,
// a single-account monthly allowance, and one still switched off after being authored.
const ROWS: ScheduleRow[] = [
  {
    id: 'sched_daily',
    name: 'estate-daily-reset',
    scope: 'All accounts',
    cadence: 'Reset remaining to $2.00 every day at 00:00 UTC',
    nextRun: 'in 6 h',
    lastRun: '18 h ago',
    enabled: true,
  },
  {
    id: 'sched_weekly',
    name: 'free-plan-monday-top-up',
    scope: 'Plan free',
    cadence: 'Add $15.00 every Monday at 06:00 UTC',
    nextRun: 'in 3 days',
    lastRun: '4 days ago',
    enabled: true,
  },
  {
    id: 'sched_monthly',
    name: 'northwind-monthly-allowance',
    scope: 'Account northwind-ai',
    cadence: 'Reset remaining to $250.00 on day 1 of each month at 00:00 UTC',
    nextRun: 'in 12 days',
    lastRun: '18 days ago',
    enabled: true,
  },
  {
    id: 'sched_draft',
    name: 'growth-plan-weekly-reset',
    scope: 'Plan growth',
    cadence: 'Reset remaining to $60.00 every Friday at 09:00 UTC',
    // A disabled schedule says "paused", never a next run — the scheduler will never reach the
    // stored `nextRunAt`, and printing it would promise a run that is not going to happen.
    nextRun: 'paused',
    lastRun: '—',
    enabled: false,
  },
];

const EMPTY_MESSAGE =
  'No reset schedules yet. Until one exists, a new billing period starts every account at whatever ' +
  'its last grant left — nothing resets on its own.';

interface ScreenProps {
  rows?: ScheduleRow[];
  loading?: boolean;
  previewRow?: ScheduleRow;
  previewStatus?: 'loading' | 'ready';
  deleteRow?: ScheduleRow;
}

function AdminBudgetSchedulesScreen({
  rows = ROWS,
  loading = false,
  previewRow,
  previewStatus = 'ready',
  deleteRow,
}: ScreenProps) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((row) => [row.id, row.enabled]))
  );

  const columns: LedgerColumn<ScheduleRow>[] = [
    // Track widths mirror `admin-budget-schedules-centre.tsx` exactly — see its own note on why the
    // cadence sentence is the only column left fluid.
    { key: 'name', header: 'Name', accessor: (row) => row.name, width: '150px' },
    { key: 'scope', header: 'Applies to', accessor: (row) => row.scope, width: '140px' },
    { key: 'cadence', header: 'What it does', accessor: (row) => row.cadence },
    {
      key: 'nextRun',
      header: 'Next run',
      accessor: (row) => row.nextRun,
      kind: 'data',
      width: '96px',
    },
    {
      key: 'lastRun',
      header: 'Last run',
      accessor: (row) => row.lastRun,
      kind: 'data',
      width: '96px',
    },
    {
      key: 'enabled',
      header: 'Enabled',
      width: '72px',
      accessor: (row) => (
        <Toggle
          checked={enabled[row.id] ?? row.enabled}
          onCheckedChange={(next) => setEnabled((current) => ({ ...current, [row.id]: next }))}
          aria-label={`${row.name} enabled`}
        />
      ),
    },
  ];

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Budget schedules"
          subtitle={RESET_SCHEDULE_ENFORCEMENT_CAPTION}
          action={
            <Button type="button" variant="primary" size="sm">
              + New schedule
            </Button>
          }
        />

        <Card>
          {!loading && rows.length === 0 ? <InlineStatus>{EMPTY_MESSAGE}</InlineStatus> : null}

          <LedgerTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            loading={loading}
            loadingRowCount={4}
            renderRowActions={(row) => (
              <RowActionGroup
                aria-label={`${row.name} actions`}
                actions={[
                  { key: 'edit', label: 'Edit', onClick: () => {} },
                  { key: 'preview', label: 'Preview', emphasis: 'strong', onClick: () => {} },
                  { key: 'delete', label: 'Del', emphasis: 'muted', onClick: () => {} },
                ]}
              />
            )}
          />
        </Card>
      </div>

      {previewRow ? (
        <BottomSheet
          open
          onOpenChange={() => {}}
          title={`Preview — ${previewRow.name}`}
          subtitle={previewRow.cadence}
          footer={
            <Button type="button" variant="primary" size="sm" disabled={previewStatus !== 'ready'}>
              Run now, for real
            </Button>
          }>
          <BudgetSchedulePreview
            status={previewStatus}
            dryRun
            windowLabel="2 Sep 2026, 00:00 UTC"
            entries={previewStatus === 'ready' ? budgetSchedulePreviewEntries : []}
            totalEntryCount={previewStatus === 'ready' ? 137 : 0}
            entryLimit={PREVIEW_ENTRY_LIMIT}
            deferredCount={previewStatus === 'ready' ? 3 : 0}
            supersededCount={previewStatus === 'ready' ? 11 : 0}
          />
        </BottomSheet>
      ) : null}

      {deleteRow ? (
        <TypedConfirmDialog
          open
          title={`Delete ${deleteRow.name}?`}
          description={
            'This removes the standing rule, so it never fires again. The grants it already wrote ' +
            'stay on the ledger — that is append-only and nothing here touches it. There is no ' +
            'read path to recover the rule’s own settings afterwards.'
          }
          objectName={deleteRow.name}
          confirmLabel="Delete schedule"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      ) : null}
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminBudgetSchedulesScreen> = {
  title: 'Pages/AdminBudgetSchedules',
  component: AdminBudgetSchedulesScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminBudgetSchedulesScreen>;

export const List: Story = { render: () => <AdminBudgetSchedulesScreen /> };

export const ListLight: Story = {
  name: 'List — wireframe (light)',
  render: () => <AdminBudgetSchedulesScreen />,
  globals: { theme: 'wireframe' },
};

// An inline status line over a still-rendered table header, never a centred placard.
export const ListEmpty: Story = {
  name: 'List — no schedules yet',
  render: () => <AdminBudgetSchedulesScreen rows={[]} />,
};

export const ListEmptyLight: Story = {
  name: 'List — no schedules yet — wireframe (light)',
  render: () => <AdminBudgetSchedulesScreen rows={[]} />,
  globals: { theme: 'wireframe' },
};

export const ListLoading: Story = {
  name: 'List — loading',
  render: () => <AdminBudgetSchedulesScreen rows={[]} loading />,
};

export const PreviewSheet: Story = {
  name: 'Preview — the dry-run sheet over the list',
  render: () => <AdminBudgetSchedulesScreen previewRow={ROWS[0]} />,
};

export const PreviewSheetLight: Story = {
  name: 'Preview — wireframe (light)',
  render: () => <AdminBudgetSchedulesScreen previewRow={ROWS[0]} />,
  globals: { theme: 'wireframe' },
};

// "Run now, for real" is disabled until the dry run has actually returned — nobody fires an
// estate-wide grant off a button they pressed before seeing what it would do.
export const PreviewInFlight: Story = {
  name: 'Preview — in flight, Run now still refused',
  render: () => <AdminBudgetSchedulesScreen previewRow={ROWS[0]} previewStatus="loading" />,
};

export const DeleteConfirmation: Story = {
  name: 'Delete — the typed confirmation for a standing rule',
  render: () => <AdminBudgetSchedulesScreen deleteRow={ROWS[0]} />,
};

export const ListMobile: Story = {
  name: 'List — mobile',
  globals: { viewport: { value: 'base390' } },
  render: () => <AdminBudgetSchedulesScreen />,
};
