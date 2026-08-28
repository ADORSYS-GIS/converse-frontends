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

function Demo({ lastExports }: { lastExports: { filename: string; date: string }[] }) {
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
        lastExports={lastExports}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <Demo
      lastExports={[
        { filename: '2026-01 · CSV', date: '4 d ago' },
        { filename: '2025-12 · PDF', date: '2026-01-03' },
      ]}
    />
  ),
};

// console-ui#326 — "Export history is unwired.", never "No exports yet." (that phrasing implied
// an export had been attempted and simply came up empty; `lastExports` is never fetched).
export const HistoryUnwired: Story = {
  render: () => <Demo lastExports={[]} />,
};

// console-ui#325 — pressing Generate report while report export isn't wired yet: a non-alert
// status line with Dismiss, never an ErrorLine with Retry.
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
        notice={{ message: "Report export isn't available yet.", onDismiss: () => {} }}
        lastExports={[]}
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
        lastExports={[]}
      />
    </div>
  ),
};
