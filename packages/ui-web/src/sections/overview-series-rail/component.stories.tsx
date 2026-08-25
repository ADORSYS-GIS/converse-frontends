import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { OVERVIEW_SERIES_RAIL_LABEL, OverviewSeriesRail } from './component';
import { overviewSeriesLegendItems } from './fixtures';

const meta: Meta<typeof OverviewSeriesRail> = {
  title: 'Sections/OverviewSeriesRail',
  component: OverviewSeriesRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewSeriesRail>;

function Demo({ initial = null }: { initial?: string | null }) {
  const [selected, setSelected] = useState<string | null>(initial);
  return (
    <div className="w-[280px] bg-surface">
      <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
        <OverviewSeriesRail
          items={overviewSeriesLegendItems}
          selectedKey={selected}
          onSelectKey={setSelected}
        />
      </RailPanel>
    </div>
  );
}

export const InRail: Story = { render: () => <Demo /> };

// Selected — the accent appears exactly once, on the selected series.
export const Selected: Story = { render: () => <Demo initial="claude-sonnet" /> };

export const Empty: Story = {
  render: () => (
    <div className="w-[280px] bg-surface">
      <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
        <OverviewSeriesRail items={[]} />
      </RailPanel>
    </div>
  ),
};
