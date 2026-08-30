import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ManageProjectsLedger } from './component';
import { manageProjectsFixture, manageTotals } from './fixtures';
import type { ProjectRow } from './types';

const meta: Meta<typeof ManageProjectsLedger> = {
  title: 'Sections/ManageProjectsLedger',
  component: ManageProjectsLedger,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageProjectsLedger>;

function Demo({
  projects = manageProjectsFixture,
  loading = false,
  error,
}: {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
}) {
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  return (
    <div className="p-6">
      <ManageProjectsLedger
        projects={projects}
        loading={loading}
        error={error}
        onRetry={() => {}}
        totals={projects.length ? manageTotals : undefined}
        selectedRowKeys={selected ? [selected.id] : []}
        onSelectRow={setSelected}
        pagination={{ shown: projects.length, total: 24, hasPrev: false, hasNext: true }}
      />
    </div>
  );
}

export const Populated: Story = { render: () => <Demo /> };

export const Empty: Story = { render: () => <Demo projects={[]} /> };

export const Loading: Story = { render: () => <Demo projects={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo projects={[]} error="Failed to load projects." />,
};

// Base tier (<600): the ledger scrolls horizontally inside its own container.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
