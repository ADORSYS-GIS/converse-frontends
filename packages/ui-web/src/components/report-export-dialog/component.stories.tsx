import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ScopeSelect } from '../scope-select';
import { scopeAccounts, scopeProjects, scopeSelectValue } from '../scope-select/fixtures';
import { ReportExportDialog } from './component';

const meta: Meta<typeof ReportExportDialog> = {
  title: 'Primitives/Overlays/ReportExportDialog',
  component: ReportExportDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    period: '2026-02',
    onPeriodChange: fn(),
    scopeSlot: (
      <ScopeSelect
        accounts={scopeAccounts}
        projects={scopeProjects}
        value={scopeSelectValue}
        onChange={() => {}}
      />
    ),
    groupByOptions: [
      { value: 'project-model', label: 'Project × Model' },
      { value: 'project', label: 'Project' },
      { value: 'model', label: 'Model' },
    ],
    groupBy: 'project-model',
    onGroupByChange: fn(),
    includeToggles: [
      { id: 'totals', label: 'Totals row', checked: true },
      { id: 'per-model', label: 'Per-model breakdown', checked: false },
    ],
    onToggleInclude: fn(),
    format: 'csv',
    onFormatChange: fn(),
    onGenerate: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ReportExportDialog>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Closed: Story = { args: { open: false } };

export const Generating: Story = { args: { generating: true } };

export const PlaceholderNotice: Story = {
  args: {
    notice: { message: "Report export isn't available yet.", onDismiss: fn() },
  },
};

/**
 * The DASHBOARD-page export (converse-frontends#453) — the same dialog, opened from any
 * YAML-driven page's `PageHeader`. Three controls are gone rather than disabled: a dashboard
 * report's window is the page's own range picker (echoed read-only here), its scope is the route
 * it was opened from, and each panel's grouping is `dashboards.yaml`'s. What is left is the one
 * genuine choice — the format — plus the one thing a reader actually varies, whether the tables
 * ride along with the charts.
 */
const dashboardArgs = {
  title: 'Export · Overview',
  period: undefined,
  onPeriodChange: undefined,
  scopeSlot: undefined,
  groupByOptions: undefined,
  groupBy: undefined,
  onGroupByChange: undefined,
  rangeEcho: 'This month · 1 – 14 Sep 2026 · UTC',
  includeToggles: [{ id: 'tables', label: 'Include tables', checked: true }],
  format: 'pdf' as const,
};

export const DashboardExport: Story = {
  name: 'Dashboard page export',
  args: dashboardArgs,
};

export const DashboardExportLight: Story = {
  name: 'Dashboard page export — wireframe (light)',
  args: dashboardArgs,
  globals: { theme: 'wireframe' },
};

export const DashboardExportGenerating: Story = {
  name: 'Dashboard page export — generating',
  args: { ...dashboardArgs, generating: true },
};

/** Spec §8.3's `Failed` state: the renderer was unreachable or the template did not compile. The
 *  form keeps every input and `Retry` re-runs the same request. */
export const DashboardExportFailed: Story = {
  name: 'Dashboard page export — failed',
  args: {
    ...dashboardArgs,
    error: {
      message: 'The report renderer is unreachable. The PDF could not be produced.',
      onRetry: fn(),
    },
  },
};
