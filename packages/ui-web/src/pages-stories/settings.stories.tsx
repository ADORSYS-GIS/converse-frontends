// Page-level acceptance story for SETTINGS — sections composed inside `ConsoleShell` with the
// section fixtures.
//
// Phase 6 (admin/settings revamp — Attio pattern, real routes): `/settings/account` and
// `/settings/projects` are two real routes now, not two sections stacked under one header. This
// story simulates both with one component (`screen: 'account' | 'projects'`), the same way
// `apps/console`'s `AccountSettingsCentre`/`ProjectSettingsCentre` are two containers sharing one
// `SettingsSubNav`. The horizontal `SubNav` here is built with static items rather than the app's
// `SettingsSubNav` wrapper (which reads `usePathname()`/`next/link` — `ui-web` stays
// framework-agnostic and never imports either).
//
// SETTINGS has **no right rail**, and that is the point of the screen rather than an omission:
// nothing on it retargets on a selection (console-ui skill — "before adding a rail to a screen,
// ask whether its content retargets on selection; if it does not, it is a toolbar"). It also has
// no filters beyond `ProjectSettings`' own search box.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AccountNameDialog } from '../components/account-name-dialog';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DetailSheet } from '../components/detail-sheet';
import { ProjectNameDialog } from '../components/project-name-dialog';
import { SubNav } from '../components/sub-nav';
import type { SubNavItem } from '../components/sub-nav';
import { AccountSettings } from '../sections/account-settings';
import type { AccountSettingsAccount, AccountSettingsDetails } from '../sections/account-settings';
import {
  accountDetailsFixture,
  accountDetailsNoQuotaFixture,
  namedAccountPanelFixture,
} from '../sections/account-settings/fixtures';
import { ProjectSettings, ProjectSettingsDetail } from '../sections/project-settings';
import type { ProjectSettingsRow } from '../sections/project-settings';
import { projectSettingsFixture } from '../sections/project-settings/fixtures';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface SettingsScreenProps {
  /** Which real route this story simulates — `/settings/account` or `/settings/projects`. */
  screen?: 'account' | 'projects';
  /** `null` = signed in with no account at all. An account whose own `name` is `null` is the
   *  separate, and far more common, unnamed state. */
  account?: AccountSettingsAccount | null;
  details?: AccountSettingsDetails | null;
  projects?: ProjectSettingsRow[];
  loading?: boolean;
  error?: string;
  showAdmin?: boolean;
  /** Opens `AccountNameDialog` on mount, the way `?account-name=true` does for real. */
  initialAccountDialogOpen?: boolean;
  /** Opens `DetailSheet` on this project on mount, the way `?row=<project id>` does for real. */
  initialSelectedProjectId?: string | null;
  /** Also opens `ProjectNameDialog` on mount, the way `?rename=true` does for real (only
   *  meaningful alongside `initialSelectedProjectId`). */
  initialRenameOpen?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/settings/account`|`/settings/projects`
// routes perform for real.
function SettingsScreen({
  screen = 'account',
  account = namedAccountPanelFixture.account,
  details = accountDetailsFixture,
  projects = projectSettingsFixture,
  loading = false,
  error,
  showAdmin = false,
  initialAccountDialogOpen = false,
  initialSelectedProjectId = null,
  initialRenameOpen = false,
}: SettingsScreenProps) {
  // Storybook demo state only — `apps/console`'s real dialog drafts live in each hook's own
  // sanctioned local state.
  const [accountDialogOpen, setAccountDialogOpen] = useState(initialAccountDialogOpen);
  const [accountName, setAccountName] = useState(account?.name ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSelectedProjectId
  );
  const [renameOpen, setRenameOpen] = useState(initialRenameOpen);
  const [search, setSearch] = useState('');
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const renameTarget = renameOpen ? selectedProject : null;
  const [projectName, setProjectName] = useState(renameTarget?.name ?? '');

  const tabs: SubNavItem[] = [
    { key: 'account', label: 'Account', href: '/settings/account', active: screen === 'account' },
    {
      key: 'projects',
      label: 'Projects',
      href: '/settings/projects',
      count: projects.length,
      active: screen === 'projects',
    },
  ];

  return (
    <ConsoleShell sidebar={storySidebar('settings', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" subtitle={account ? (account.name ?? 'Unnamed account') : undefined} />

        <SubNav orientation="horizontal" items={tabs} />

        {screen === 'account' ? (
          <>
            <AccountSettings
              panel={{
                account,
                loading: false,
                onCreate: () => setAccountDialogOpen(true),
                onRename: () => setAccountDialogOpen(true),
                onRetry: () => {},
              }}
              details={details}
              onCopyId={() => {}}
            />

            <AccountNameDialog
              open={accountDialogOpen}
              mode={account === null ? 'create' : 'rename'}
              subjectLabel={account?.id ?? 'auth0|9f3a2c7e41b0'}
              currentlyNamed={(account?.name ?? null) !== null}
              name={accountName}
              onNameChange={setAccountName}
              submitting={false}
              canSubmit={account === null || accountName.trim() !== (account.name ?? '')}
              onSubmit={() => setAccountDialogOpen(false)}
              onCancel={() => setAccountDialogOpen(false)}
            />
          </>
        ) : (
          <>
            <Card>
              <ProjectSettings
                projects={projects}
                loading={loading}
                error={error}
                onRetry={() => {}}
                search={search}
                onSearchChange={setSearch}
                pagination={{ shown: projects.length, total: projects.length, hasPrev: false, hasNext: false }}
                selectedProjectId={selectedProjectId ?? undefined}
                onSelectRow={(project) => {
                  setSelectedProjectId(project.id);
                  setRenameOpen(false);
                }}
              />
            </Card>

            <DetailSheet
              open={selectedProject !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedProjectId(null);
                  setRenameOpen(false);
                }
              }}
              title={selectedProject?.name ?? ''}
              footer={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!selectedProject) return;
                    setProjectName(selectedProject.name);
                    setRenameOpen(true);
                  }}>
                  Rename
                </Button>
              }>
              {selectedProject ? <ProjectSettingsDetail project={selectedProject} /> : null}
            </DetailSheet>

            <ProjectNameDialog
              open={renameTarget !== null}
              projectId={renameTarget?.id ?? ''}
              currentName={renameTarget?.name ?? ''}
              name={projectName}
              onNameChange={setProjectName}
              submitting={false}
              canSubmit={projectName.trim().length > 0 && projectName.trim() !== renameTarget?.name}
              onSubmit={() => setRenameOpen(false)}
              onCancel={() => setRenameOpen(false)}
            />
          </>
        )}
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof SettingsScreen> = {
  title: 'Pages/Settings',
  component: SettingsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SettingsScreen>;

export const Populated: Story = { render: () => <SettingsScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <SettingsScreen />,
  globals: { theme: 'wireframe' },
};

export const ProjectsScreen: Story = {
  name: 'Projects — /settings/projects',
  render: () => <SettingsScreen screen="projects" />,
};

export const Empty: Story = {
  name: 'No projects yet — an inline line under a rendered heading',
  render: () => <SettingsScreen screen="projects" projects={[]} />,
};

export const Loading: Story = {
  render: () => <SettingsScreen screen="projects" projects={[]} loading />,
};

export const ErrorState: Story = {
  render: () => <SettingsScreen screen="projects" projects={[]} error="Could not load projects." />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <SettingsScreen showAdmin />,
};

// ── the account flow (converse-frontends#365, moved here from MANAGE) ────────────────────────
//
// It lived on `/manage` because that was the only governance surface the console had. Now that
// there is a Settings screen, a core account mutation sitting beside a ledger's filters is exactly
// the defect this screen exists to fix (owner: "We cannot modify account core information on the
// same page we're filtering").

/**
 * Signed in, no account. Every other screen is empty in this state — there is nothing to scope by
 * — which is what the reported "I cannot create an account on the console" was about. The exit
 * now lives on the screen that owns account identity, restyled as an `EmptyState` block.
 */
export const NoAccount: Story = {
  name: 'Account — none yet (the reported dead end)',
  render: () => <SettingsScreen account={null} details={null} projects={[]} />,
};

/** Same state with the create dialog open, which is what `?account-name=true` produces. */
export const NoAccountDialogOpen: Story = {
  name: 'Account — create dialog open',
  render: () => (
    <SettingsScreen account={null} details={null} projects={[]} initialAccountDialogOpen />
  ),
};

/**
 * The state most production accounts are in today: `Account.name` shipped nullable with no
 * truthful backfill (lightbridge-authz#551), so an account created before that migration has never
 * been named. Restyled as an `EmptyState` block with the "Name this account" CTA.
 */
export const UnnamedAccount: Story = {
  name: 'Account — unnamed (name === null)',
  render: () => (
    <SettingsScreen
      account={{ id: 'auth0|1b77de04aa93', name: null }}
      details={accountDetailsNoQuotaFixture}
    />
  ),
};

export const UnnamedAccountLight: Story = {
  name: 'Account — unnamed, wireframe (light)',
  render: () => (
    <SettingsScreen
      account={{ id: 'auth0|1b77de04aa93', name: null }}
      details={accountDetailsNoQuotaFixture}
    />
  ),
  globals: { theme: 'wireframe' },
};

/** Opening the naming dialog from an unnamed account: the verb is "Name", not "Rename". */
export const UnnamedAccountDialogOpen: Story = {
  name: 'Account — naming an unnamed account',
  render: () => (
    <SettingsScreen
      account={{ id: 'auth0|1b77de04aa93', name: null }}
      details={accountDetailsNoQuotaFixture}
      initialAccountDialogOpen
    />
  ),
};

/**
 * The whole flow driven through the real controls: press `Create account`, type a name, submit.
 * Interaction rather than a static arg set, because the thing worth pinning is that the section's
 * primary actually reaches the dialog.
 */
export const CreateAccountFlow: Story = {
  name: 'Account — create flow, driven',
  render: () => <SettingsScreen account={null} details={null} projects={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));

    // The dialog portals to `document.body`, outside `canvasElement`.
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Create account');

    await userEvent.type(within(dialog).getByLabelText('Account name'), 'Widgets Ltd');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument()
    );
  },
};

// ── the project rename flow ──────────────────────────────────────────────────────────────────

/** A project row's click opens `DetailSheet` with its full field list (phase 9, Addition C). */
export const ProjectDetailOpen: Story = {
  name: 'Project — DetailSheet open',
  render: () => (
    <SettingsScreen screen="projects" initialSelectedProjectId="proj_b93e1d55" />
  ),
};

export const RenameProjectDialogOpen: Story = {
  name: 'Project — rename dialog open, stacked on the sheet',
  render: () => (
    <SettingsScreen
      screen="projects"
      initialSelectedProjectId="proj_b93e1d55"
      initialRenameOpen
    />
  ),
};

/** Driven through the sheet's own footer control, which is what makes the sheet-first targeting
 *  real: the row opens the sheet, the sheet's Rename button opens the dialog. */
export const RenameProjectFlow: Story = {
  name: 'Project — rename flow, driven',
  render: () => <SettingsScreen screen="projects" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The row's accessible name is the label AND its status/tier summary run together
    // ("batch-evalactive · Not assigned") — a regex anchored on the label, not an exact match.
    await userEvent.click(canvas.getByRole('button', { name: /^batch-eval/ }));

    const sheet = await within(document.body).findByRole('dialog', { name: 'batch-eval' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Rename' }));

    const dialog = await within(document.body).findByRole('dialog', { name: 'Rename project' });
    // The dialog opened on the row that was pressed, not on the first project on the page.
    await expect(dialog).toHaveTextContent('proj_b93e1d55');

    const field = within(dialog).getByLabelText('Project name');
    await userEvent.clear(field);
    await userEvent.type(field, 'batch-eval-v2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save name' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog', { name: 'Rename project' })).not.toBeInTheDocument()
    );
  },
};

// `md` tier (600–1024): the persistent left rail returns; there is no right rail to dock, and no
// sheet triggers, because this screen has no rail sections at all.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <SettingsScreen />,
};

// Base tier (<600): single column, nav docked as a fixed bottom navigation bar.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsScreen />,
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsScreen />,
};
