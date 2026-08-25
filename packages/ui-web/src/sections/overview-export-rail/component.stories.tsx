import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { OVERVIEW_EXPORT_RAIL_LABEL, OverviewExportRail } from './component';
import { overviewExportCaption } from './fixtures';

const meta: Meta<typeof OverviewExportRail> = {
  title: 'Sections/OverviewExportRail',
  component: OverviewExportRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewExportRail>;

export const InRail: Story = {
  render: () => (
    <div className="w-[280px] bg-surface">
      <RailPanel label={OVERVIEW_EXPORT_RAIL_LABEL}>
        <OverviewExportRail onExport={() => {}} caption={overviewExportCaption} />
      </RailPanel>
    </div>
  ),
};
