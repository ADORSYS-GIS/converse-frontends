import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { MANAGE_SELECTION_RAIL_LABEL, ManageSelectionRail } from './component';
import { selectedProjectFixture, suspendedProjectFixture } from './fixtures';

const meta: Meta<typeof ManageSelectionRail> = {
  title: 'Sections/ManageSelectionRail',
  component: ManageSelectionRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageSelectionRail>;

function InRailPanel({ project }: { project: typeof selectedProjectFixture | null }) {
  return (
    <div className="bg-surface w-[280px]">
      <RailPanel label={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={project} />
      </RailPanel>
    </div>
  );
}

export const RowSelected: Story = {
  render: () => <InRailPanel project={selectedProjectFixture} />,
};

export const SuspendedRowSelected: Story = {
  render: () => <InRailPanel project={suspendedProjectFixture} />,
};

export const Empty: Story = { render: () => <InRailPanel project={null} /> };
