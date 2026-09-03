import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { EmptyState } from '../../components/empty-state';
import type { LedgerSort } from '../../components/ledger-table';
import { ProjectsLedger } from './component';
import { projectsFixture } from './fixtures';
import type { ProjectRow } from './types';

const meta: Meta<typeof ProjectsLedger> = {
  title: 'Sections/Account/ProjectsLedger',
  component: ProjectsLedger,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProjectsLedger>;

function Demo({
  projects = projectsFixture,
  loading = false,
  error,
}: {
  projects?: ProjectRow[];
  loading?: boolean;
  error?: string;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [sort, setSort] = useState<LedgerSort | undefined>();

  return (
    <div className="p-6">
      <ProjectsLedger
        projects={projects}
        loading={loading}
        error={error}
        onRetry={() => {}}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        selectedRowKeys={selected ? [selected.id] : []}
        onSelectRow={setSelected}
        pagination={{ shown: projects.length, total: 24, hasPrev: false, hasNext: true }}
      />
    </div>
  );
}

export const Populated: Story = { render: () => <Demo /> };

// Every row's `spendMtd` resolved to a real figure — `use-projects-screen.ts`'s wired state.
export const SpendWired: Story = {
  render: () => (
    <Demo
      projects={projectsFixture.map((project, index) => ({
        ...project,
        spendMtd: index % 4 === 0 ? 0 : Math.round((index + 1) * 42.75 * 100) / 100,
      }))}
    />
  ),
};

// A true empty collection: no `+ New project` gating shown here since this story has no header.
export const EmptyCollection: Story = {
  render: () => (
    <div className="p-6">
      <ProjectsLedger
        projects={[]}
        search=""
        onSearchChange={() => {}}
        onSelectRow={() => {}}
        emptyState={
          <EmptyState
            headline="No projects yet"
            explainer="Create your first project to start issuing API keys."
            action={
              <Button type="button" variant="primary">
                + New project
              </Button>
            }
          />
        }
      />
    </div>
  ),
};

// A filter narrowed a real collection down to nothing — the table's structure stays.
export const FilteredEmpty: Story = {
  render: () => (
    <div className="p-6">
      <ProjectsLedger
        projects={[]}
        search="zzz"
        onSearchChange={() => {}}
        onSelectRow={() => {}}
        filteredEmptyMessage="No projects match “zzz”."
      />
    </div>
  ),
};

export const Loading: Story = { render: () => <Demo projects={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo projects={[]} error="Failed to load projects." />,
};

// Base tier (<600): the ledger scrolls horizontally inside its own container.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
