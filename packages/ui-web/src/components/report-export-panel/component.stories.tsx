import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReportExportPanel } from './component';
import type { ReportExportFormat, ReportIncludeToggle } from './types';

const meta: Meta<typeof ReportExportPanel> = {
  title: 'Forms & actions/ReportExportPanel',
  component: ReportExportPanel,
};

export default meta;
type Story = StoryObj<typeof ReportExportPanel>;

const groupByOptions = [
  { value: 'project', label: 'Project' },
  { value: 'project-model', label: 'Project × Model' },
];

function Demo() {
  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [toggles, setToggles] = useState<ReportIncludeToggle[]>([
    { id: 'per-model', label: 'Per-model breakdown', checked: true },
    { id: 'zero-usage', label: 'Include zero-usage projects', checked: false },
  ]);

  return (
    <div className="bg-surface w-[280px] p-4">
      <ReportExportPanel
        period={period}
        onPeriodChange={setPeriod}
        scopeSlot={
          <div className="flex flex-col gap-1.5">
            <span className="text-subtle block font-mono text-[10px] tracking-[.09em] uppercase">
              Scope
            </span>
            <div className="border-border bg-chrome text-soft flex h-[30px] items-center rounded-[2px] border px-3 font-mono text-sm">
              Account · adorsys-gis
            </div>
          </div>
        }
        groupByOptions={groupByOptions}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        includeToggles={toggles}
        onToggleInclude={(id, checked) =>
          setToggles((prev) =>
            prev.map((toggle) => (toggle.id === id ? { ...toggle, checked } : toggle))
          )
        }
        format={format}
        onFormatChange={setFormat}
        onGenerate={() => {}}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};

// console-ui#325 — pressing Generate report on a genuine failure (e.g. the usage backend is
// unreachable): a non-alert status line with Dismiss, never an ErrorLine with Retry.
export const Notice: Story = {
  render: () => (
    <div className="bg-surface w-[280px] p-4">
      <ReportExportPanel
        period="2026-02"
        onPeriodChange={() => {}}
        scopeSlot={null}
        groupByOptions={groupByOptions}
        groupBy="project"
        onGroupByChange={() => {}}
        includeToggles={[{ id: 'per-model', label: 'Per-model breakdown', checked: false }]}
        onToggleInclude={() => {}}
        format="csv"
        onFormatChange={() => {}}
        onGenerate={() => {}}
        notice={{ message: 'Could not generate the report. Try again.', onDismiss: () => {} }}
      />
    </div>
  ),
};

export const Generating: Story = {
  render: () => (
    <div className="bg-surface w-[280px] p-4">
      <ReportExportPanel
        period="2026-02"
        onPeriodChange={() => {}}
        scopeSlot={null}
        groupByOptions={groupByOptions}
        groupBy="project"
        onGroupByChange={() => {}}
        includeToggles={[{ id: 'per-model', label: 'Per-model breakdown', checked: false }]}
        onToggleInclude={() => {}}
        format="csv"
        onFormatChange={() => {}}
        onGenerate={() => {}}
        generating
      />
    </div>
  ),
};
