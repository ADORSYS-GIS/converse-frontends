// Page-level acceptance story for MANAGE — sections composed inside `ConsoleShell` with the
// section fixtures, 1:1 against docs/design/console-redesign/manage-projects.svg.
//
// Shell revamp phase 3 (right rail out, owner review 2026-08-29/2026-08-30): the right-hand
// FILTERS/MONTHLY REPORT/SELECTION aside is gone. FILTERS (account · status · budget state ·
// search) is `ManageControls` in `PageHeader.controls`; MONTHLY REPORT is a secondary
// `PageHeader.action` button that opens `ReportExportDialog`; SELECTION is a `DetailSheet` that
// opens on row pick and hosts `ProjectDetail`, at every tier — there is no separate compact-tier
// sheet trigger any more, because the sheet is now the ONE way this content is ever reached.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../components/button';
import { ConsoleShell } from '../components/console-shell';
import { CreateProjectDialog } from '../components/create-project-dialog';
import type { CreateProjectPlanOption } from '../components/create-project-dialog';
import { DetailSheet } from '../components/detail-sheet';
import { InlineStatus } from '../components/inline-status';
import { ReportExportDialog } from '../components/report-export-dialog';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { ScopeSelect } from '../components/scope-select';
import { ManageControls } from '../sections/manage-controls';
import {
  manageAccountOptions,
  manageBudgetStateOptions,
  manageStatusOptions,
} from '../sections/manage-controls/fixtures';
import { ManageProjectsLedger } from '../sections/manage-projects-ledger';
import { manageProjectsFixture, manageTotals } from '../sections/manage-projects-ledger/fixtures';
import type { ProjectRow } from '../sections/manage-projects-ledger';
import { ProjectDetail } from '../sections/project-detail';
import {
  scopeAccounts,
  scopeProjects,
  scopeSelectValue,
} from '../components/scope-select/fixtures';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

/**
 * Matches `apps/console`'s `MANAGE_SPEND_PENDING_MESSAGE` (`use-manage-screen.ts`) verbatim —
 * duplicated rather than imported because `packages/ui-web` never depends on `apps/console`.
 */
const MANAGE_SPEND_PENDING_MESSAGE =
  'Spend and quota ceiling are unwired: no usage-backend query client yet. Project status and quota tier below are live.';

interface ManageScreenProps {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
  initialSelection?: ProjectRow | null;
  showAdmin?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/manage` route perform for real.
function ManageScreen({
  projects = manageProjectsFixture,
  loading = false,
  error,
  initialSelection = null,
  showAdmin = false,
}: ManageScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(initialSelection);
  const [accountValue, setAccountValue] = useState('all');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('all');

  const [reportOpen, setReportOpen] = useState(false);
  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [generating, setGenerating] = useState(false);
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'totals', label: 'Totals row', checked: true },
    { id: 'per-model', label: 'Per-model breakdown', checked: false },
  ]);

  // Storybook demo state only — `apps/console`'s real dialog draft lives in
  // `use-manage-screen.ts`'s own sanctioned local state (ticket #303).
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [billingIdentity, setBillingIdentity] = useState('');
  const [planId, setPlanId] = useState<string | null>('pro');
  const plans: CreateProjectPlanOption[] = [
    { id: 'free', name: 'Free' },
    { id: 'pro', name: 'Pro' },
    { id: 'enterprise', name: 'Enterprise' },
  ];

  return (
    <ConsoleShell sidebar={storySidebar('manage', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Projects"
          controls={
            <ManageControls
              accountValue={accountValue}
              accountOptions={manageAccountOptions}
              onAccountChange={setAccountValue}
              statusOptions={manageStatusOptions}
              statusValue={statusValue}
              onStatusChange={setStatusValue}
              budgetStateValue={budgetStateValue}
              budgetStateOptions={manageBudgetStateOptions}
              onBudgetStateChange={setBudgetStateValue}
              search={search}
              onSearchChange={setSearch}
            />
          }
          action={
            <>
              <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>
                Monthly report
              </Button>
              <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                + New project
              </Button>
            </>
          }
        />

        {/* The account panel and its naming dialog moved to `/settings` (see
            `settings.stories.tsx`): Manage is a filtering and browsing screen, and a core account
            mutation does not belong beside a ledger's filters. */}
        <InlineStatus>{MANAGE_SPEND_PENDING_MESSAGE}</InlineStatus>

        <CreateProjectDialog
          open={createOpen}
          accountLabel="acct_01"
          name={projectName}
          onNameChange={setProjectName}
          billingIdentity={billingIdentity}
          onBillingIdentityChange={setBillingIdentity}
          plans={plans}
          plansLoading={false}
          onRetryPlans={() => {}}
          planId={planId}
          onPlanChange={setPlanId}
          submitting={false}
          canSubmit={projectName.trim().length > 0 && billingIdentity.trim().length > 0}
          onSubmit={() => setCreateOpen(false)}
          onCancel={() => setCreateOpen(false)}
        />

        <ReportExportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          period={period}
          onPeriodChange={setPeriod}
          scopeSlot={
            <ScopeSelect
              accounts={scopeAccounts}
              projects={scopeProjects}
              value={scopeSelectValue}
              onChange={() => {}}
            />
          }
          groupByOptions={[
            { value: 'project-model', label: 'Project × Model' },
            { value: 'project', label: 'Project' },
            { value: 'model', label: 'Model' },
          ]}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          includeToggles={includeToggles}
          onToggleInclude={(id, checked) =>
            setIncludeToggles((prev) => prev.map((t) => (t.id === id ? { ...t, checked } : t)))
          }
          format={format}
          onFormatChange={setFormat}
          generating={generating}
          onGenerate={() => {
            setGenerating(true);
            setTimeout(() => setGenerating(false), 400);
          }}
        />

        <ManageProjectsLedger
          projects={projects}
          loading={loading}
          error={error}
          onRetry={() => {}}
          totals={projects.length ? manageTotals : undefined}
          selectedRowKeys={selectedProject ? [selectedProject.id] : []}
          onSelectRow={setSelectedProject}
          pagination={{ shown: projects.length, total: 24, hasPrev: false, hasNext: true }}
        />
      </div>

      <DetailSheet
        open={selectedProject !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null);
        }}
        title={selectedProject?.name ?? ''}
        subtitle={selectedProject?.account}>
        {selectedProject ? <ProjectDetail project={selectedProject} /> : null}
      </DetailSheet>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ManageScreen> = {
  title: 'Pages/Manage',
  component: ManageScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageScreen>;

// Full page, populated 1:1 against manage-projects.svg.
export const Populated: Story = { render: () => <ManageScreen /> };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <ManageScreen />,
  globals: { theme: 'wireframe' },
};

// A row selected — `DetailSheet` opens with that project's detail.
export const RowSelected: Story = {
  render: () => <ManageScreen initialSelection={manageProjectsFixture[0]} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'gateway-prod' })).toBeInTheDocument()
    );
  },
};

export const Empty: Story = { render: () => <ManageScreen projects={[]} /> };

export const Loading: Story = { render: () => <ManageScreen projects={[]} loading /> };

export const ErrorState: Story = {
  render: () => <ManageScreen projects={[]} error="Failed to load projects for this account." />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <ManageScreen showAdmin />,
};

// `md` tier (600–1024) — controls wrap inline in the title row; MONTHLY REPORT is the same dialog
// as `lg`, and SELECTION opens the same `DetailSheet` at this tier too.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <ManageScreen />,
};

export const MdTierReportDialogOpen: Story = {
  name: 'md tier — Monthly report dialog open',
  globals: { viewport: { value: 'md900' } },
  render: () => <ManageScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Monthly report' }));

    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'Monthly report' })).toBeInTheDocument()
    );
  },
};

// Base tier (<600): single column, controls wrap, nav docked as a fixed bottom navigation bar,
// the projects ledger scrolls horizontally inside its own container.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <ManageScreen />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `MobileBaseTier`.
export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <ManageScreen />,
};
