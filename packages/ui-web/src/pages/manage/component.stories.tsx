import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleHeader } from '../../components/console-header';
import { fieldControlVariants, fieldLabelClassName } from '../../components/field/cva';
import type { LastExportEntry, ReportExportFormat, ReportIncludeToggle } from '../../components/report-export-panel';
import { ManagePage } from './component';
import {
  manageAccountOptions,
  manageAdminNavItems,
  manageBudgetStateOptions,
  manageLastExports,
  manageNavItems,
  manageProjectsFixture,
  manageStatusOptions,
  manageSubNavItems,
  manageTotals,
} from './fixtures';
import type { ProjectRow } from './types';

const identity = (
  <div className="flex items-center gap-3">
    <span className="hidden font-mono text-[11px] text-subtle md:inline">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);
const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;
const header = <ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />;
const nav = { items: manageNavItems, adminItems: manageAdminNavItems, showAdmin: false };

const scopeSlot = (
  <div className="flex flex-col gap-1.5">
    <span className={fieldLabelClassName}>Scope</span>
    <select value="account:adorsys-gis" onChange={() => {}} className={fieldControlVariants({ error: false, multiline: false })}>
      <option value="account:adorsys-gis">Account · adorsys-gis</option>
    </select>
  </div>
);

function StatefulManagePage({
  projects = manageProjectsFixture,
  loading = false,
  error,
  initialSelection = null,
}: {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
  initialSelection?: ProjectRow | null;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProjectRow | null>(initialSelection);
  const [accountValue, setAccountValue] = useState('all');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('any');
  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'per-model', label: 'Per-model breakdown', checked: true },
    { id: 'zero-usage', label: 'Include zero-usage projects', checked: false },
  ]);
  const [lastExports, setLastExports] = useState<LastExportEntry[]>(manageLastExports);
  const [generating, setGenerating] = useState(false);

  return (
    <ManagePage
      header={header}
      nav={nav}
      subNav={{ items: manageSubNavItems }}
      projects={projects}
      loading={loading}
      error={error}
      onRetry={() => {}}
      totals={projects.length > 0 ? manageTotals : undefined}
      search={search}
      onSearchChange={setSearch}
      onNewProject={() => {}}
      selectedRowKeys={selected ? [selected.id] : []}
      onSelectRow={setSelected}
      selectedProject={selected}
      pagination={{ shown: 12, total: 24, hasPrev: false, hasNext: true }}
      reportExport={{
        period,
        onPeriodChange: setPeriod,
        scopeSlot,
        groupByOptions: [
          { value: 'project-model', label: 'Project × Model' },
          { value: 'project', label: 'Project' },
          { value: 'model', label: 'Model' },
        ],
        groupBy,
        onGroupByChange: setGroupBy,
        includeToggles,
        onToggleInclude: (id, checked) =>
          setIncludeToggles((prev) => prev.map((t) => (t.id === id ? { ...t, checked } : t))),
        format,
        onFormatChange: setFormat,
        generating,
        lastExports,
        onGenerate: (params) => {
          setGenerating(true);
          setTimeout(() => {
            setGenerating(false);
            setLastExports((prev) => [{ filename: `${params.period} · ${params.format.toUpperCase()}`, date: 'just now' }, ...prev]);
          }, 400);
        },
      }}
      filters={{
        accountValue,
        accountOptions: manageAccountOptions,
        onAccountChange: setAccountValue,
        statusOptions: manageStatusOptions,
        statusValue,
        onStatusChange: setStatusValue,
        budgetStateValue,
        budgetStateOptions: manageBudgetStateOptions,
        onBudgetStateChange: setBudgetStateValue,
      }}
    />
  );
}

const meta: Meta<typeof ManagePage> = {
  title: 'Pages/ManagePage',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManagePage>;

// Full page, populated 1:1 against docs/design/console-redesign/manage-projects.svg.
export const Populated: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulManagePage />
    </div>
  ),
};

// A row selected — the right-rail SELECTION panel retargets to it.
export const RowSelected: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulManagePage initialSelection={manageProjectsFixture[0]} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulManagePage projects={[]} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulManagePage projects={[]} loading />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulManagePage projects={[]} error="Failed to load projects for this account." />
    </div>
  ),
};

// `md` tier (600–1024) — MANAGE sub-nav stays inline, REPORT/FILTERS/SELECTION dock as a
// BottomSheet. A real viewport resize is what exercises the `md:` classes now the shell is
// CSS-tiered, not a wrapper `<div>`.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <StatefulManagePage />,
};

// Base tier (<600, a designed target — console-ui skill "Shape and layout"): single column,
// search/`+ New project` stack, nav docked as a fixed bottom navigation bar, the projects
// ledger scrolls horizontally inside its own container, REPORT & FILTERS reachable via the
// right rail's BottomSheet peek row, MANAGE sub-nav reachable via the header's drawer trigger.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <StatefulManagePage />,
};
