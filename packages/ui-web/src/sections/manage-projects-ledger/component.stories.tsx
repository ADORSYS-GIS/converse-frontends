import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionSheetTrigger } from '../../components/section-sheet-trigger';
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
  toolbarActions,
  reportTrigger,
}: {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
  toolbarActions?: React.ReactNode;
  reportTrigger?: React.ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  return (
    <div className="p-6">
      <ManageProjectsLedger
        projects={projects}
        loading={loading}
        error={error}
        onRetry={() => {}}
        totals={projects.length ? manageTotals : undefined}
        search={search}
        onSearchChange={setSearch}
        onNewProject={() => {}}
        selectedRowKeys={selected ? [selected.id] : []}
        onSelectRow={setSelected}
        pagination={{ shown: projects.length, total: 24, hasPrev: false, hasNext: true }}
        toolbarActions={toolbarActions}
        reportTrigger={reportTrigger}
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

// Ticket #303 — the account-owner-only gate stated before a submission attempt.
export const NewProjectGated: Story = {
  render: () => (
    <div className="p-6">
      <ManageProjectsLedger
        projects={manageProjectsFixture}
        onRetry={() => {}}
        totals={manageTotals}
        search=""
        onSearchChange={() => {}}
        onNewProject={() => {}}
        newProjectDisabled
        newProjectReason="Only the account owner can create a project."
        onSelectRow={() => {}}
        pagination={{
          shown: manageProjectsFixture.length,
          total: 24,
          hasPrev: false,
          hasNext: true,
        }}
      />
    </div>
  ),
};

export const MdTierWithTriggers: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => (
    <Demo
      toolbarActions={
        <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="Filters">
          <p className="text-ink font-mono text-xs">Account · Status · Budget state</p>
        </SectionSheetTrigger>
      }
      reportTrigger={
        <SectionSheetTrigger
          icon="report"
          triggerLabel="Open monthly report"
          label="Monthly report">
          <p className="text-ink font-mono text-xs">Period · Group by · Format</p>
        </SectionSheetTrigger>
      }
    />
  ),
};

// Base tier (<600): the ledger scrolls horizontally inside its own container.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
