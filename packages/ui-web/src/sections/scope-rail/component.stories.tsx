import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { SCOPE_RAIL_LABEL, ScopeRail } from './component';
import { scopeRailFixture } from './fixtures';

const meta: Meta<typeof ScopeRail> = {
  title: 'Sections/ScopeRail',
  component: ScopeRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ScopeRail>;

// The LEFT rail is 208px wide (README §3).
export const InRail: Story = {
  render: () => (
    <div className="w-[208px] bg-surface">
      <RailPanel label={SCOPE_RAIL_LABEL}>
        <ScopeRail {...scopeRailFixture} />
      </RailPanel>
    </div>
  ),
};

export const AllProjects: Story = {
  render: () => (
    <div className="w-[208px] bg-surface">
      <RailPanel label={SCOPE_RAIL_LABEL}>
        <ScopeRail accountLabel="adorsys-gis" projectLabel="all projects" />
      </RailPanel>
    </div>
  ),
};
