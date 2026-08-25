import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { API_KEYS_FILTERS_RAIL_LABEL, ApiKeysFiltersRail } from './component';
import { apiKeysStatusFilterOptions } from './fixtures';

const meta: Meta<typeof ApiKeysFiltersRail> = {
  title: 'Sections/ApiKeysFiltersRail',
  component: ApiKeysFiltersRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysFiltersRail>;

function Demo() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  return (
    <div className="w-[280px] bg-surface">
      <RailPanel label={API_KEYS_FILTERS_RAIL_LABEL}>
        <ApiKeysFiltersRail
          statusOptions={apiKeysStatusFilterOptions}
          statusValue={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
        />
      </RailPanel>
    </div>
  );
}

export const InRail: Story = { render: () => <Demo /> };
