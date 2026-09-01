import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ScopeSelect } from '../scope-select';
import { scopeAccounts, scopeProjects, scopeSelectValue } from '../scope-select/fixtures';
import { ReportExportDialog } from './component';

const meta: Meta<typeof ReportExportDialog> = {
  title: 'Forms & actions/ReportExportDialog',
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
