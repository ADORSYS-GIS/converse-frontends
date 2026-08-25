import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { API_KEYS_LIFECYCLE_RAIL_LABEL, ApiKeysLifecycleRail } from './component';

const meta: Meta<typeof ApiKeysLifecycleRail> = {
  title: 'Sections/ApiKeysLifecycleRail',
  component: ApiKeysLifecycleRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysLifecycleRail>;

export const InRail: Story = {
  render: () => (
    <div className="w-[280px] bg-surface">
      <RailPanel label={API_KEYS_LIFECYCLE_RAIL_LABEL}>
        <ApiKeysLifecycleRail />
      </RailPanel>
    </div>
  ),
};
