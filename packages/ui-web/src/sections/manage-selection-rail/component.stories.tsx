import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import { MANAGE_SELECTION_RAIL_LABEL, ManageSelectionRail } from './component';
import { selectedProjectFixture, suspendedProjectFixture } from './fixtures';

const meta: Meta<typeof ManageSelectionRail> = {
  title: 'Sections/ManageSelectionRail',
  component: ManageSelectionRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageSelectionRail>;

function InCard({ project }: { project: typeof selectedProjectFixture | null }) {
  return (
    <div className="bg-surface w-[280px]">
      <Card title={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={project} />
      </Card>
    </div>
  );
}

export const RowSelected: Story = {
  render: () => <InCard project={selectedProjectFixture} />,
};

export const SuspendedRowSelected: Story = {
  render: () => <InCard project={suspendedProjectFixture} />,
};

export const Empty: Story = { render: () => <InCard project={null} /> };
