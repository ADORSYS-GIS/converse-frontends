import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ProjectSettings, ProjectSettingsDetail } from './component';
import { defaultProjectFixture, projectSettingsFixture } from './fixtures';

const meta: Meta<typeof ProjectSettings> = {
  title: 'Sections/ProjectSettings',
  component: ProjectSettings,
  args: {
    projects: projectSettingsFixture,
    onSelectRow: fn(),
    onRetry: fn(),
    search: '',
    onSearchChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProjectSettings>;

/**
 * The three rows between them cover every state a project's settings can be in: a default project
 * with no tier, a configured one, and a suspended one under an `allowlist` model policy.
 */
export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** An inline status line above still-rendered structure — the heading stays put. */
export const Empty: Story = {
  name: 'Empty — a line above the structure, never a placard',
  args: { projects: [] },
};

export const Loading: Story = {
  name: 'Loading — skeleton blocks, no spinner',
  args: { projects: [], loading: true, loadingRowCount: 3 },
};

export const ErrorState: Story = {
  name: 'Failed fetch — a signal line with an inline Retry',
  args: { projects: [], error: 'Could not load projects.' },
};

/** The row a click opens — `DetailSheet`'s current selection (phase 9, Addition C). Rename lives
 *  inside that sheet now, not on the row (`apps/console`'s `project-settings-centre.tsx`). */
export const RowSelected: Story = {
  name: 'A row open in DetailSheet — data-current, not a hand-written fill',
  args: { selectedProjectId: projectSettingsFixture[1].id },
};

export const WithPagination: Story = {
  name: '10/page — Pagination row, real Previous/Next',
  args: {
    pagination: { shown: 3, total: 24, hasPrev: true, hasNext: true, onPrev: fn(), onNext: fn() },
  },
};

export const FilteredEmpty: Story = {
  name: 'Search narrowed the list to nothing — distinct from an empty account',
  args: {
    projects: [],
    search: 'nonexistent',
    filteredEmptyMessage: 'No projects match “nonexistent”.',
  },
};

export const MobileBaseTier: Story = {
  name: 'Mobile base tier (<600)',
  globals: { viewport: { value: 'base390' } },
};

/** `DetailSheet`'s body for one open row — the full field list a summary row's click reveals. */
export const DetailBody: StoryObj<typeof ProjectSettingsDetail> = {
  name: 'ProjectSettingsDetail — the sheet body a row opens',
  render: () => <ProjectSettingsDetail project={defaultProjectFixture} />,
};
