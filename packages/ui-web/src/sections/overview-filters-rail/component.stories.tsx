import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { OVERVIEW_FILTERS_RAIL_LABEL, OverviewFiltersRail } from './component';
import { ACCOUNT_FILTER_OPTIONS, MODEL_FILTER_OPTIONS, PROJECT_FILTER_OPTIONS } from './fixtures';

const meta: Meta<typeof OverviewFiltersRail> = {
  title: 'Sections/OverviewFiltersRail',
  component: OverviewFiltersRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewFiltersRail>;

function Demo() {
  const [project, setProject] = useState('all');
  const [model, setModel] = useState('all');

  return (
    <div className="w-[280px] bg-surface">
      <RailPanel label={OVERVIEW_FILTERS_RAIL_LABEL}>
        <OverviewFiltersRail
          accountField={{
            label: 'Account',
            value: 'adorsys-gis',
            options: ACCOUNT_FILTER_OPTIONS,
            onChange: () => {},
          }}
          projectField={{
            label: 'Project',
            value: project,
            options: PROJECT_FILTER_OPTIONS,
            onChange: setProject,
          }}
          modelField={{
            label: 'Model',
            value: model,
            options: MODEL_FILTER_OPTIONS,
            onChange: setModel,
          }}
        />
      </RailPanel>
    </div>
  );
}

export const InRail: Story = { render: () => <Demo /> };
