// Page-level acceptance story for PROJECTS (renamed from Manage, 2026-08-30 revamp brief) —
// sections composed inside `ConsoleShell` with the section fixtures, 1:1 against
// docs/design/console-redesign/manage-projects.svg.
//
// Shell revamp phase 3 (right rail out, owner review 2026-08-29/2026-08-30): the right-hand
// FILTERS/MONTHLY REPORT/SELECTION aside is gone. MONTHLY REPORT is a secondary `PageHeader.action`
// button that opens `ReportExportDialog`; SELECTION is a `DetailSheet` that opens on row pick and
// hosts `ProjectDetail`, at every tier — there is no separate compact-tier sheet trigger any more,
// because the sheet is now the ONE way this content is ever reached.
//
// 2026-08-30 revamp brief: FILTERS (status/budget-state) moved again, off `PageHeader.controls`
// and into `ProjectsLedger`'s own toolbar, alongside the search field it now owns directly — the
// toolbar, table and pager all sit inside ONE `Card` now, matching `OverviewCentre`'s own zones.
// The ACCOUNT column and the permanent em-dash totals footer are gone; SPEND MTD is a real,
// sortable column. `ManageControls`'s Account select is gone too (live findings #6, 2026-08-30):
// it duplicated the sidebar workspace switcher, which owns account scope exclusively now.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { CreateProjectDialog } from '../components/create-project-dialog';
import type { CreateProjectPlanOption } from '../components/create-project-dialog';
import { BottomSheet } from '../components/bottom-sheet';
import { EmptyState } from '../components/empty-state';
import type { LedgerSort } from '../components/ledger-table';
import { ReportExportDialog } from '../components/report-export-dialog';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { ScopeSelect } from '../components/scope-select';
import { ManageControls } from '../sections/manage-controls';
import {
  manageBudgetStateOptions,
  manageStatusOptions,
} from '../sections/manage-controls/fixtures';
import { ProjectsLedger } from '../sections/projects-ledger';
import { projectsFixture } from '../sections/projects-ledger/fixtures';
import type { ProjectRow } from '../sections/projects-ledger';
import { ProjectDetail } from '../sections/project-detail';
import {
  scopeAccounts,
  scopeProjects,
  scopeSelectValue,
} from '../components/scope-select/fixtures';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface ProjectsScreenProps {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
  initialSelection?: ProjectRow | null;
  showAdmin?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/projects` route perform for real.
function ProjectsScreen({
  projects = projectsFixture,
  loading = false,
  error,
  initialSelection = null,
  showAdmin = false,
}: ProjectsScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(initialSelection);
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('all');
  const [sort, setSort] = useState<LedgerSort | undefined>();

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
  // `use-projects-screen.ts`'s own sanctioned local state (ticket #303).
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [billingIdentity, setBillingIdentity] = useState('');
  const [planId, setPlanId] = useState<string | null>('pro');
  const plans: CreateProjectPlanOption[] = [
    { id: 'free', name: 'Free' },
    { id: 'pro', name: 'Pro' },
    { id: 'enterprise', name: 'Enterprise' },
  ];

  const filtersActive =
    Boolean(search.trim()) || statusValue !== 'all' || budgetStateValue !== 'all';

  const newProjectButton = (
    <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
      + New project
    </Button>
  );

  // Owner's final resolution on rail content (2026-08-30, "hide it if empty. Simple."): `/projects`
  // shows the rail ONLY when a row is selected — no quick-settings fallback here (that is `/`'s
  // job alone, as standing content) — so an unselected screen renders no rail at all, and
  // `ConsoleShell` collapses the column entirely.
  const rail = selectedProject ? (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-sans text-[15px] font-medium text-ink">{selectedProject.name}</div>
          <div className="text-subtle font-sans text-[12px]">
            {selectedProject.account} · {selectedProject.statusLabel}
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => {}}>
          Rename
        </Button>
      </div>
      <ProjectDetail project={selectedProject} />
    </div>
  ) : undefined;

  return (
    <ConsoleShell
      sidebar={storySidebar('projects', { isAdmin: showAdmin })}
      topBar={storyTopBar()}
      rail={rail}
      railWidth={280}
      onRailWidthChange={() => {}}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Projects"
          action={
            <>
              <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>
                Monthly report
              </Button>
              {newProjectButton}
            </>
          }
        />

        {/* The account panel and its naming dialog moved to `/settings` (see
            `settings.stories.tsx`): Projects is a filtering and browsing screen, and a core
            account mutation does not belong beside a ledger's filters. */}

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

        <Card>
          <ProjectsLedger
            projects={projects}
            loading={loading}
            error={error}
            onRetry={() => {}}
            search={search}
            onSearchChange={setSearch}
            filters={
              <ManageControls
                statusOptions={manageStatusOptions}
                statusValue={statusValue}
                onStatusChange={setStatusValue}
                budgetStateValue={budgetStateValue}
                budgetStateOptions={manageBudgetStateOptions}
                onBudgetStateChange={setBudgetStateValue}
              />
            }
            emptyState={
              filtersActive ? undefined : (
                <EmptyState
                  headline="No projects yet"
                  explainer="Create a project to start issuing API keys and tracking spend."
                  action={newProjectButton}
                />
              )
            }
            filteredEmptyMessage={filtersActive ? 'No projects match these filters.' : undefined}
            sort={sort}
            onSortChange={setSort}
            selectedRowKeys={selectedProject ? [selectedProject.id] : []}
            onSelectRow={setSelectedProject}
            pagination={{ shown: projects.length, total: 24, hasPrev: false, hasNext: true }}
          />
        </Card>
      </div>

      {/* Below `lg` only — at `lg`+ the rail above is the detail surface (owner's locked layout
          contract, 2026-08-30 restatement: "Right rail on large screens, bottom sheet on medium
          and small"). */}
      <BottomSheet
        open={selectedProject !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null);
        }}
        title={selectedProject?.name ?? ''}
        subtitle={selectedProject ? `${selectedProject.account} · ${selectedProject.statusLabel}` : undefined}
        headerAction={
          <Button type="button" variant="secondary" size="sm" onClick={() => {}}>
            Rename
          </Button>
        }
        portalClassName="lg:hidden">
        {selectedProject ? <ProjectDetail project={selectedProject} /> : null}
      </BottomSheet>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ProjectsScreen> = {
  title: 'Pages/Projects',
  component: ProjectsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProjectsScreen>;

// Full page, populated 1:1 against manage-projects.svg.
export const Populated: Story = { render: () => <ProjectsScreen /> };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <ProjectsScreen />,
  globals: { theme: 'wireframe' },
};

// A row selected, at `lg` (the default viewport) — the inspector rail is the detail surface here,
// not a dialog: the `BottomSheet` is `portalClassName="lg:hidden"` at this tier (owner's locked
// layout contract, 2026-08-30 restatement).
export const RowSelected: Story = {
  name: 'Row selected (lg — inspector rail shows detail, no dialog)',
  render: () => <ProjectsScreen initialSelection={projectsFixture[0]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('gateway-prod')).toBeInTheDocument());
    expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

// The same selection, below `lg` — the rail is absent, so the SAME content opens as a
// `BottomSheet` instead.
export const RowSelectedMdTier: Story = {
  name: 'Row selected (md — BottomSheet, no rail)',
  globals: { viewport: { value: 'md900' } },
  render: () => <ProjectsScreen initialSelection={projectsFixture[0]} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'gateway-prod' })).toBeInTheDocument()
    );
  },
};

export const Empty: Story = { render: () => <ProjectsScreen projects={[]} /> };

export const Loading: Story = { render: () => <ProjectsScreen projects={[]} loading /> };

export const ErrorState: Story = {
  render: () => <ProjectsScreen projects={[]} error="Failed to load projects for this account." />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <ProjectsScreen showAdmin />,
};

// `md` tier (600–1024) — controls wrap inline in the title row; MONTHLY REPORT is the same dialog
// as `lg`, and SELECTION opens the same `DetailSheet` at this tier too.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <ProjectsScreen />,
};

export const MdTierReportDialogOpen: Story = {
  name: 'md tier — Monthly report dialog open',
  globals: { viewport: { value: 'md900' } },
  render: () => <ProjectsScreen />,
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
  render: () => <ProjectsScreen />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `MobileBaseTier`.
export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <ProjectsScreen />,
};
