import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import type { ReportExportFormat } from '../../components/report-export-panel';
import { ScopeSelect } from '../../components/scope-select';
import type { SegmentedOption } from '../../components/segmented-control';
import { scopeAccounts, scopeProjects, scopeSelectValue } from '../../components/scope-select/fixtures';
import { MANAGE_REPORT_RAIL_LABEL, ManageReportRail } from './component';
import { manageLastExports } from './fixtures';

const meta: Meta<typeof ManageReportRail> = {
  title: 'Sections/ManageReportRail',
  component: ManageReportRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageReportRail>;

const GROUP_BY_OPTIONS: SegmentedOption<string>[] = [
  { value: 'project', label: 'Project' },
  { value: 'model', label: 'Model' },
];

function Demo({ generating = false, lastExports = manageLastExports }) {
  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [includes, setIncludes] = useState<Record<string, boolean>>({
    totals: true,
    'per-model': false,
  });

  return (
    <div className="w-[280px] bg-surface">
      <RailPanel label={MANAGE_REPORT_RAIL_LABEL}>
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
          groupByOptions={GROUP_BY_OPTIONS}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          includeToggles={[
            { id: 'totals', label: 'Totals row', checked: includes.totals },
            { id: 'per-model', label: 'Per-model breakdown', checked: includes['per-model'] },
          ]}
          onToggleInclude={(id, checked) =>
            setIncludes((current) => ({ ...current, [id]: checked }))
          }
          format={format}
          onFormatChange={setFormat}
          onGenerate={() => {}}
          generating={generating}
          lastExports={lastExports}
        />
      </RailPanel>
    </div>
  );
}

export const InRail: Story = { render: () => <Demo /> };

export const Generating: Story = { render: () => <Demo generating /> };

// Nothing exported yet — LAST EXPORTS carries an inline status line, not a placard.
export const NoPriorExports: Story = { render: () => <Demo lastExports={[]} /> };
