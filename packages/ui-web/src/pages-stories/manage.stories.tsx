// Page-level acceptance story for MANAGE — sections composed inside `ConsoleShell` with the
// section fixtures, 1:1 against docs/design/console-redesign/manage-projects.svg.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AccountNameDialog } from '../components/account-name-dialog';
import { ConsoleShell } from '../components/console-shell';
import { CreateProjectDialog } from '../components/create-project-dialog';
import type { CreateProjectPlanOption } from '../components/create-project-dialog';
import { InlineStatus } from '../components/inline-status';
import { RailPanel } from '../components/rail-panel';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { ScopeSelect } from '../components/scope-select';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { SelectionSheet } from '../components/selection-sheet';
import { SubNav } from '../components/sub-nav';
import { AccountPanel } from '../sections/account-panel';
import type { AccountPanelAccount } from '../sections/account-panel';
import { MANAGE_FILTERS_RAIL_LABEL, ManageFiltersRail } from '../sections/manage-filters-rail';
import {
  manageAccountOptions,
  manageBudgetStateOptions,
  manageStatusOptions,
} from '../sections/manage-filters-rail/fixtures';
import { ManageProjectsLedger } from '../sections/manage-projects-ledger';
import { manageProjectsFixture, manageTotals } from '../sections/manage-projects-ledger/fixtures';
import type { ProjectRow } from '../sections/manage-projects-ledger';
import { MANAGE_REPORT_RAIL_LABEL, ManageReportRail } from '../sections/manage-report-rail';
import {
  MANAGE_SELECTION_RAIL_LABEL,
  ManageSelectionRail,
} from '../sections/manage-selection-rail';
import { scopeAccounts, scopeProjects, scopeSelectValue } from '../sections/scope-rail/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
import {
  manageSubNavItems,
  storyAdminNavItems,
  storyHeader,
  storyNavItems,
} from './shell-fixtures';

/**
 * Matches `apps/console`'s `MANAGE_SPEND_PENDING_MESSAGE` (`use-manage-screen.ts`) verbatim —
 * duplicated rather than imported because `packages/ui-web` never depends on `apps/console`.
 * Console-ui#326 dropped the "(ADR 0009 follow-ups 4 and 6)" citation from the real string
 * (follow-up 4 shipped, so citing it was simply wrong); this copy follows.
 */
const MANAGE_SPEND_PENDING_MESSAGE =
  'Spend and quota ceiling are unwired: no usage-backend query client yet. Project status and quota tier below are live.';

interface ManageScreenProps {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
  initialSelection?: ProjectRow | null;
  showAdmin?: boolean;
  /** `null` = signed in with no account at all — the reported production dead end. An account
   *  whose own `name` is `null` is the separate, and today far more common, unnamed state. */
  account?: AccountPanelAccount | null;
  /** Opens `AccountNameDialog` on mount, the way `?account-name=true` does for real. */
  initialAccountDialogOpen?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/manage` route perform for real.
function ManageScreen({
  projects = manageProjectsFixture,
  loading = false,
  error,
  initialSelection = null,
  showAdmin = false,
  account = { id: 'auth0|9f3a2c7e41b0', name: 'Widgets Ltd' },
  initialAccountDialogOpen = false,
}: ManageScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(initialSelection);
  const [accountValue, setAccountValue] = useState('all');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('all');

  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [generating, setGenerating] = useState(false);
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'totals', label: 'Totals row', checked: true },
    { id: 'per-model', label: 'Per-model breakdown', checked: false },
  ]);

  // Storybook demo state only — `apps/console`'s real dialog draft lives in
  // `use-manage-screen.ts`'s own sanctioned local state (tickets #303 / #365).
  const [accountDialogOpen, setAccountDialogOpen] = useState(initialAccountDialogOpen);
  const [accountName, setAccountName] = useState(account?.name ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [billingIdentity, setBillingIdentity] = useState('');
  const [planId, setPlanId] = useState<string | null>('pro');
  const plans: CreateProjectPlanOption[] = [
    { id: 'free', name: 'Free' },
    { id: 'pro', name: 'Pro' },
    { id: 'enterprise', name: 'Enterprise' },
  ];

  const filtersRail = (
    <ManageFiltersRail
      accountValue={accountValue}
      accountOptions={manageAccountOptions}
      onAccountChange={setAccountValue}
      statusOptions={manageStatusOptions}
      statusValue={statusValue}
      onStatusChange={setStatusValue}
      budgetStateValue={budgetStateValue}
      budgetStateOptions={manageBudgetStateOptions}
      onBudgetStateChange={setBudgetStateValue}
    />
  );

  const reportRail = (
    <ManageReportRail
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
  );

  const selectionRail = <ManageSelectionRail project={selectedProject} />;

  return (
    <ConsoleShell
      header={storyHeader}
      nav={{ items: storyNavItems('manage'), adminItems: storyAdminNavItems('manage'), showAdmin }}
      leftSecondary={
        <RailPanel label="MANAGE">
          <SubNav items={manageSubNavItems} />
        </RailPanel>
      }
      leftSecondaryLabel="Manage"
      rightRail={
        <>
          <RailPanel label={MANAGE_REPORT_RAIL_LABEL}>{reportRail}</RailPanel>
          <RailPanel label={MANAGE_FILTERS_RAIL_LABEL}>{filtersRail}</RailPanel>
          <RailPanel label={MANAGE_SELECTION_RAIL_LABEL}>{selectionRail}</RailPanel>
        </>
      }>
      <div className="flex flex-col gap-6">
        <ScreenHeading title="Projects" />

        <AccountPanel
          account={account}
          loading={false}
          onCreate={() => setAccountDialogOpen(true)}
          onRename={() => setAccountDialogOpen(true)}
          onRetry={() => {}}
        />

        <InlineStatus>{MANAGE_SPEND_PENDING_MESSAGE}</InlineStatus>

        <AccountNameDialog
          open={accountDialogOpen}
          mode={account === null ? 'create' : 'rename'}
          subjectLabel={account?.id ?? 'auth0|9f3a2c7e41b0'}
          currentlyNamed={(account?.name ?? null) !== null}
          name={accountName}
          onNameChange={setAccountName}
          submitting={false}
          canSubmit={account === null || accountName.trim() !== (account.name ?? '')}
          onSubmit={() => setAccountDialogOpen(false)}
          onCancel={() => setAccountDialogOpen(false)}
        />

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

        <ManageProjectsLedger
          projects={projects}
          loading={loading}
          error={error}
          onRetry={() => {}}
          totals={projects.length ? manageTotals : undefined}
          search={search}
          onSearchChange={setSearch}
          onNewProject={() => setCreateOpen(true)}
          selectedRowKeys={selectedProject ? [selectedProject.id] : []}
          onSelectRow={setSelectedProject}
          pagination={{ shown: projects.length, total: 24, hasPrev: false, hasNext: true }}
          toolbarActions={
            <SectionSheetTrigger
              icon="filter"
              triggerLabel="Open filters"
              label={MANAGE_FILTERS_RAIL_LABEL}>
              {filtersRail}
            </SectionSheetTrigger>
          }
          reportTrigger={
            <SectionSheetTrigger
              icon="report"
              triggerLabel="Open monthly report"
              label={MANAGE_REPORT_RAIL_LABEL}>
              {reportRail}
            </SectionSheetTrigger>
          }
        />
      </div>

      {/* SELECTION has no trigger of its own — it is selection-driven, and `SelectionSheet` is
          gated by `useIsBelowLg` so a selection at `lg` never opens an invisible modal. */}
      <SelectionSheet
        selectionKey={selectedProject?.id ?? null}
        label={MANAGE_SELECTION_RAIL_LABEL}>
        {selectionRail}
      </SelectionSheet>
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

// A row selected — the right-rail SELECTION section retargets to it.
export const RowSelected: Story = {
  render: () => <ManageScreen initialSelection={manageProjectsFixture[0]} />,
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

// ── the account flow (converse-frontends#365) ────────────────────────────────────────────────

/**
 * Signed in, no account. Every other affordance on this screen is inert in this state — the
 * projects ledger has nothing to list and `+ New project` reads "Select an account to create a
 * project." with no account to select — which is exactly the reported "I cannot create an account
 * on the console". The exit lives next to the dead end.
 */
export const NoAccount: Story = {
  name: 'Account — none yet (the reported dead end)',
  render: () => <ManageScreen projects={[]} account={null} />,
};

/** Same state with the create dialog open, which is what `?account-name=true` produces. */
export const NoAccountDialogOpen: Story = {
  name: 'Account — create dialog open',
  render: () => <ManageScreen projects={[]} account={null} initialAccountDialogOpen />,
};

/**
 * The state most production accounts are in today: `Account.name` shipped nullable with no
 * truthful backfill (lightbridge-authz#551), so an account created before that migration has
 * never been named. The panel names the absence and offers "Name this account" — it does not
 * quietly print the id in the name's place.
 */
export const UnnamedAccount: Story = {
  name: 'Account — unnamed (name === null)',
  render: () => <ManageScreen account={{ id: 'auth0|1b77de04aa93', name: null }} />,
};

export const UnnamedAccountLight: Story = {
  name: 'Account — unnamed, wireframe (light)',
  render: () => <ManageScreen account={{ id: 'auth0|1b77de04aa93', name: null }} />,
  globals: { theme: 'wireframe' },
};

/** Opening the naming dialog from an unnamed account: the verb is "Name", not "Rename". */
export const UnnamedAccountDialogOpen: Story = {
  name: 'Account — naming an unnamed account',
  render: () => (
    <ManageScreen account={{ id: 'auth0|1b77de04aa93', name: null }} initialAccountDialogOpen />
  ),
};

/**
 * The whole flow driven through the real controls: press `Create account`, type a name, submit.
 * Interaction rather than a static arg set, because the thing worth pinning is that the panel's
 * primary actually reaches the dialog.
 */
export const CreateAccountFlow: Story = {
  name: 'Account — create flow, driven',
  render: () => <ManageScreen projects={[]} account={null} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));

    // The dialog portals to `document.body`, outside `canvasElement`.
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Create account');

    await userEvent.type(within(dialog).getByLabelText('Account name'), 'Widgets Ltd');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument()
    );
  },
};

// `md` tier (600–1024) — MANAGE sub-nav stays inline; the right rail has no persistent
// footer/peek bar. FILTERS via the trigger beside the search field; MONTHLY REPORT via the
// trigger by the table's totals/footer zone; SELECTION opens itself once a row is selected.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <ManageScreen />,
};

export const MdTierFiltersSheetOpen: Story = {
  name: 'md tier — FILTERS sheet open',
  globals: { viewport: { value: 'md900' } },
  render: () => <ManageScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open filters' }));

    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole('dialog', { name: 'FILTERS' })).toBeInTheDocument());
  },
};

// Same `md` tier, with a row already selected — SELECTION opens itself (no trigger needed): a
// real browser's `matchMedia` correctly reports "below lg" at this viewport, so `useIsBelowLg`
// lets the selection-driven open through.
export const MdTierSelectionSheetOpen: Story = {
  name: 'md tier — SELECTION sheet open on row select',
  globals: { viewport: { value: 'md900' } },
  render: () => <ManageScreen initialSelection={manageProjectsFixture[0]} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'SELECTION' })).toBeInTheDocument()
    );
  },
};

// Base tier (<600): single column, search/`+ New project` stack, nav docked as a fixed bottom
// navigation bar, the projects ledger scrolls horizontally inside its own container.
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
