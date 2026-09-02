// Page-level acceptance story for `/settings/accounts/<id>/projects` — sections composed inside
// `ConsoleShell` with the section fixtures.
//
// IA v3 phase E ("the settings/accounts move", converse-frontends#368): moved wholesale off
// `/accounts/[accountId]/projects` (this file used to be `projects.stories.tsx`, `Pages/Projects`)
// to its own settings-area screen, `git mv`d along with the route it fixtures. Two real
// consequences of that move, both reproduced here:
//
//  1. **No right rail — ever.** `/settings/*` has no inspector rail at any tier (ADR 0013 D2), so
//     the selected project's detail is `BottomSheet` at EVERY tier now, not only below `lg` — the
//     same surface `admin-budget-review.stories.tsx` (`/settings/refills-queue`) already
//     demonstrates for its own review detail. `ConsoleShell`'s `rail` prop is a real primitive
//     capability still (`component.stories.tsx` exercises it directly), it just has no live
//     caller left anywhere in `apps/console` — this story does not pass one.
//  2. **The account-detail sub-nav** (`AccountDetailSubNav`, `apps/console`) sits right under the
//     header — the same three-tab row `/settings/accounts/<id>` and `/request-refill` both
//     render. Built with static `SubNav` items here rather than the app's own pathname-aware
//     wrapper, the same "framework-agnostic fixture" split `settings.stories.tsx` already uses for
//     its own horizontal `SubNav`.
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
import { SubNav } from '../components/sub-nav';
import type { SubNavItem } from '../components/sub-nav';
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

const ACCOUNT_ID = 'acct_49534505';

function accountDetailTabs(active: 'overview' | 'projects' | 'request-refill'): SubNavItem[] {
  return [
    {
      key: 'overview',
      label: 'Overview',
      href: `/settings/accounts/${ACCOUNT_ID}`,
      active: active === 'overview',
    },
    {
      key: 'projects',
      label: 'Projects',
      href: `/settings/accounts/${ACCOUNT_ID}/projects`,
      active: active === 'projects',
    },
    {
      key: 'request-refill',
      label: 'Request refill',
      href: `/settings/accounts/${ACCOUNT_ID}/request-refill`,
      active: active === 'request-refill',
    },
  ];
}

interface ProjectsScreenProps {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
  initialSelection?: ProjectRow | null;
  showAdmin?: boolean;
  /** `?create=true` on load — opens the create-project dialog, the same one-shot landing intent
   *  `use-projects-entry-params.ts` drives for real (see `projects-centre.tsx`'s own doc
   *  comment). */
  initialCreateOpen?: boolean;
}

// The composition `apps/console`'s `(console)` layout + the
// `/settings/accounts/<id>/projects` route perform for real.
function ProjectsScreen({
  projects = projectsFixture,
  loading = false,
  error,
  initialSelection = null,
  showAdmin = false,
  initialCreateOpen = false,
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
  // `use-create-project-dialog.ts`'s own sanctioned local state.
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
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

  return (
    <ConsoleShell sidebar={storySidebar('settings', { showAdmin })} topBar={storyTopBar()}>
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

        <SubNav orientation="horizontal" items={accountDetailTabs('projects')} />

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

      {/* The ONE detail surface, at every tier — settings has no rail to hand this off to at
          `lg`+ (owner's locked layout contract narrowed by ADR 0013 D2: no right rail in settings,
          at any tier). No `portalClassName="lg:hidden"` any more — that gate existed only to
          avoid a simultaneously-interactive rail-plus-sheet pair, which no longer exists. */}
      <BottomSheet
        open={selectedProject !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null);
        }}
        title={selectedProject?.name ?? ''}
        subtitle={
          selectedProject
            ? `${selectedProject.account} · ${selectedProject.statusLabel}`
            : undefined
        }
        headerAction={
          <Button type="button" variant="secondary" size="sm" onClick={() => {}}>
            Rename
          </Button>
        }>
        {selectedProject ? <ProjectDetail project={selectedProject} /> : null}
      </BottomSheet>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ProjectsScreen> = {
  title: 'Pages/Settings/AccountProjects',
  component: ProjectsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProjectsScreen>;

// Full page, populated.
export const Populated: Story = { render: () => <ProjectsScreen /> };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <ProjectsScreen />,
  globals: { theme: 'wireframe' },
};

// A row selected, at `lg` (the default viewport) — `BottomSheet` is the ONE detail surface now,
// at every tier, since settings has no right rail (ADR 0013 D2).
export const RowSelected: Story = {
  name: 'Row selected — BottomSheet at every tier, lg included',
  render: () => <ProjectsScreen initialSelection={projectsFixture[0]} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'gateway-prod' })).toBeInTheDocument()
    );
  },
};

// The identical selection, below `lg` — the same surface, because there was never a second one
// to gate it out of at this tier.
export const RowSelectedMdTier: Story = {
  name: 'Row selected (md — the identical BottomSheet)',
  globals: { viewport: { value: 'md900' } },
  render: () => <ProjectsScreen initialSelection={projectsFixture[0]} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'gateway-prod' })).toBeInTheDocument()
    );
  },
};

// `?create=true` — the create-project dialog opens on load (task directive:
// "project creation would be inside /settings/accounts/<account-id>/projects?create=true").
export const CreateOnLoad: Story = {
  name: '?create=true — create-project dialog opens on load',
  render: () => <ProjectsScreen initialCreateOpen />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'New project' })).toBeInTheDocument()
    );
  },
};

export const Empty: Story = { render: () => <ProjectsScreen projects={[]} /> };

export const Loading: Story = { render: () => <ProjectsScreen projects={[]} loading /> };

export const ErrorState: Story = {
  render: () => <ProjectsScreen projects={[]} error="Failed to load projects for this account." />,
};

// Owner review round 2 (2026-08-31, converse-frontends#368 finding #1): the settings rail's own
// showAdmin-gated "Admin" row (`settingsNavGroups`), not an "Operator group" any more — that group
// is deleted outright from the account-area rail (`console-chrome.tsx`'s `navGroups`).
export const AdminNav: Story = {
  name: 'Nav — admin (Admin row visible)',
  render: () => <ProjectsScreen showAdmin />,
};

// `md` tier (600–1024) — controls wrap inline in the title row; MONTHLY REPORT is the same dialog
// as `lg`, and SELECTION opens the same `BottomSheet` at this tier too.
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
