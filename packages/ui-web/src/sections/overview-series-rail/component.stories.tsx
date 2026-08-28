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
    <div className="bg-surface w-[280px]">
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

// #273 — zero items now explain themselves instead of leaving a bare "SERIES" heading over
// nothing. Generic default wording; Overview's own container passes the specific "not wired"
// reason instead (see `Unwired` below).
export const Empty: Story = {
  render: () => (
    <div className="bg-surface w-[280px]">
      <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
        <OverviewSeriesRail items={[]} />
      </RailPanel>
    </div>
  ),
};

export const Unwired: Story = {
  render: () => (
    <div className="bg-surface w-[280px]">
      <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
        <OverviewSeriesRail items={[]} emptyMessage="Not wired — see banner above." />
      </RailPanel>
    </div>
  ),
};
