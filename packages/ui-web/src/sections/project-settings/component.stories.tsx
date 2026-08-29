import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ProjectSettings } from './component';
import { projectSettingsFixture } from './fixtures';

const meta: Meta<typeof ProjectSettings> = {
  title: 'Sections/ProjectSettings',
  component: ProjectSettings,
  args: {
    projects: projectSettingsFixture,
    onRename: fn(),
    onRetry: fn(),
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

/** The presentation-only mirror of `model.Project.update`'s owner-or-member `@@allow` gate. */
export const RenameGated: Story = {
  name: 'Renaming not possible — the reason is stated, not discovered on submit',
  args: {
    renameDisabled: true,
    renameReason: 'Only the account owner or a project member can rename a project.',
  },
};

export const MobileBaseTier: Story = {
  name: 'Mobile base tier (<600)',
  globals: { viewport: { value: 'base390' } },
};
