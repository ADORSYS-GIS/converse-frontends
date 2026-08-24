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
    <div className="w-[280px] bg-surface p-4">
      <ReportExportPanel
        period={period}
        onPeriodChange={setPeriod}
        scopeSlot={
          <div className="flex flex-col gap-1.5">
            <span className="block font-mono text-[10px] uppercase tracking-[.09em] text-subtle">Scope</span>
            <div className="flex h-[30px] items-center rounded-[2px] border border-border bg-chrome px-3 font-mono text-sm text-soft">
              Account · adorsys-gis
            </div>
          </div>
        }
        groupByOptions={groupByOptions}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        includeToggles={toggles}
        onToggleInclude={(id, checked) =>
          setToggles((prev) => prev.map((toggle) => (toggle.id === id ? { ...toggle, checked } : toggle)))
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

export const NoExportsYet: Story = {
  render: () => <Demo lastExports={[]} />,
};

export const Generating: Story = {
  render: () => (
    <div className="w-[280px] bg-surface p-4">
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
