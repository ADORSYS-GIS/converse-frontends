import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { OVERVIEW_VIEW_RAIL_LABEL, OverviewViewRail } from './component';
import { BUCKET_OPTIONS, GROUP_BY_OPTIONS, RANGE_OPTIONS } from './fixtures';

const meta: Meta<typeof OverviewViewRail> = {
  title: 'Sections/OverviewViewRail',
  component: OverviewViewRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewViewRail>;

function Demo() {
  const [range, setRange] = useState('last-30');
  const [bucket, setBucket] = useState('daily');
  const [groupBy, setGroupBy] = useState('project-model');

  return (
    // The rail COLUMN owns `bg-surface`; the section itself is a flush, borderless block.
    <div className="w-[280px] bg-surface">
      <RailPanel label={OVERVIEW_VIEW_RAIL_LABEL}>
        <OverviewViewRail
          rangeField={{ label: 'Range', value: range, options: RANGE_OPTIONS, onChange: setRange }}
          bucketField={{
            label: 'Bucket',
            value: bucket,
            options: BUCKET_OPTIONS,
            onChange: setBucket,
          }}
          groupByField={{
            label: 'Group by',
            value: groupBy,
            options: GROUP_BY_OPTIONS,
            onChange: setGroupBy,
          }}
        />
      </RailPanel>
    </div>
  );
}

export const InRail: Story = { render: () => <Demo /> };
