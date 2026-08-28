import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { OVERVIEW_EXPORT_RAIL_LABEL, OverviewExportRail } from './component';
import { overviewExportCaption, overviewExportUnavailableCaption } from './fixtures';

const meta: Meta<typeof OverviewExportRail> = {
  title: 'Sections/OverviewExportRail',
  component: OverviewExportRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewExportRail>;

export const InRail: Story = {
  render: () => (
    <div className="bg-surface w-[280px]">
      <RailPanel label={OVERVIEW_EXPORT_RAIL_LABEL}>
        <OverviewExportRail onExport={() => {}} caption={overviewExportCaption} />
      </RailPanel>
    </div>
  ),
};

// console-ui#324 — the real state today: the CSV export route doesn't exist yet, so the control
// is disabled with the reason stated beside it rather than a button that silently does nothing.
export const Unavailable: Story = {
  render: () => (
    <div className="bg-surface w-[280px]">
      <RailPanel label={OVERVIEW_EXPORT_RAIL_LABEL}>
        <OverviewExportRail disabled caption={overviewExportUnavailableCaption} />
      </RailPanel>
    </div>
  ),
};
