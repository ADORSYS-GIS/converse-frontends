// Page-level acceptance story for MANAGE — sections composed inside `ConsoleShell` with the
// section fixtures, 1:1 against docs/design/console-redesign/manage-projects.svg.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ConsoleShell } from '../components/console-shell';
import { RailPanel } from '../components/rail-panel';
import type {
  LastExportEntry,
  ReportExportFormat,
  ReportIncludeToggle,
} from '../components/report-export-panel';
import { ScopeSelect } from '../components/scope-select';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { SelectionSheet } from '../components/selection-sheet';
import { SubNav } from '../components/sub-nav';
import { MANAGE_FILTERS_RAIL_LABEL, ManageFiltersRail } from '../sections/manage-filters-rail';
import {
  manageAccountOptions,
  manageBudgetStateOptions,
  manageStatusOptions,
} from '../sections/manage-filters-rail/fixtures';
import { ManageProjectsLedger } from '../sections/manage-projects-ledger';
import {
  manageProjectsFixture,
  manageTotals,
} from '../sections/manage-projects-ledger/fixtures';
import type { ProjectRow } from '../sections/manage-projects-ledger';
import { MANAGE_REPORT_RAIL_LABEL, ManageReportRail } from '../sections/manage-report-rail';
import { manageLastExports } from '../sections/manage-report-rail/fixtures';
import { MANAGE_SELECTION_RAIL_LABEL, ManageSelectionRail } from '../sections/manage-selection-rail';
import { scopeAccounts, scopeProjects, scopeSelectValue } from '../sections/scope-rail/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
import { manageSubNavItems, storyAdminNavItems, storyHeader, storyNavItems } from './shell-fixtures';

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
  const [budgetStateValue, setBudgetStateValue] = useState('any');

  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [generating, setGenerating] = useState(false);
  const [lastExports, setLastExports] = useState<LastExportEntry[]>(manageLastExports);
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'totals', label: 'Totals row', checked: true },
    { id: 'per-model', label: 'Per-model breakdown', checked: false },
  ]);

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
      lastExports={lastExports}
      onGenerate={(params) => {
        setGenerating(true);
        setTimeout(() => {
          setGenerating(false);
          setLastExports((prev) => [
            { filename: `${params.period} · ${params.format.toUpperCase()}`, date: 'just now' },
            ...prev,
          ]);
        }, 400);
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
        <ScreenHeading title="Projects" subline="spend shown month-to-date" />

        <ManageProjectsLedger
          projects={projects}
          loading={loading}
          error={error}
          onRetry={() => {}}
          totals={projects.length ? manageTotals : undefined}
          search={search}
          onSearchChange={setSearch}
          onNewProject={() => {}}
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
