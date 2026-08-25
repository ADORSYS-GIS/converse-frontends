import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { MANAGE_SELECTION_RAIL_LABEL, ManageSelectionRail } from './component';
import { archivedProjectFixture, selectedProjectFixture } from './fixtures';

const meta: Meta<typeof ManageSelectionRail> = {
  title: 'Sections/ManageSelectionRail',
  component: ManageSelectionRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageSelectionRail>;

function InRailPanel({ project }: { project: typeof selectedProjectFixture | null }) {
  return (
    <div className="w-[280px] bg-surface">
      <RailPanel label={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={project} />
      </RailPanel>
    </div>
  );
}

export const RowSelected: Story = {
  render: () => <InRailPanel project={selectedProjectFixture} />,
};

export const ArchivedRowSelected: Story = {
  render: () => <InRailPanel project={archivedProjectFixture} />,
};

export const Empty: Story = { render: () => <InRailPanel project={null} /> };
