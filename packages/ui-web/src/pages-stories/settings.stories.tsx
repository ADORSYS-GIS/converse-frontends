// Page-level acceptance story for SETTINGS — sections composed inside `ConsoleShell` with the
// section fixtures.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.
//
// SETTINGS has **no right rail**, and that is the point of the screen rather than an omission:
// nothing on it retargets on a selection (console-ui skill — "before adding a rail to a screen,
// ask whether its content retargets on selection; if it does not, it is a toolbar"). It also has
// no filters at all. `/manage` is where you find a project; this is where you change what one is.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AccountNameDialog } from '../components/account-name-dialog';
import { ConsoleShell } from '../components/console-shell';
import { ProjectNameDialog } from '../components/project-name-dialog';
import { RailPanel } from '../components/rail-panel';
import { SubNav } from '../components/sub-nav';
import { AccountSettings } from '../sections/account-settings';
import type { AccountSettingsDetails } from '../sections/account-settings';
import {
  accountDetailsFixture,
  accountDetailsNoQuotaFixture,
  namedAccountPanelFixture,
} from '../sections/account-settings/fixtures';
import type { AccountPanelAccount } from '../sections/account-panel';
import { ProjectSettings } from '../sections/project-settings';
import type { ProjectSettingsRow } from '../sections/project-settings';
import { projectSettingsFixture } from '../sections/project-settings/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
import {
  settingsSubNavItems,
  storyAdminNavItems,
  storyHeader,
  storyNavItems,
} from './shell-fixtures';

interface SettingsScreenProps {
  /** `null` = signed in with no account at all. An account whose own `name` is `null` is the
   *  separate, and far more common, unnamed state. */
  account?: AccountPanelAccount | null;
  details?: AccountSettingsDetails | null;
  projects?: ProjectSettingsRow[];
  loading?: boolean;
  error?: string;
  showAdmin?: boolean;
  /** Opens `AccountNameDialog` on mount, the way `?account-name=true` does for real. */
  initialAccountDialogOpen?: boolean;
  /** Opens `ProjectNameDialog` on mount, the way `?rename=<project id>` does for real. */
  initialRenameProjectId?: string | null;
}

// The composition `apps/console`'s `(console)` layout + `/settings` route perform for real.
function SettingsScreen({
  account = namedAccountPanelFixture.account,
  details = accountDetailsFixture,
  projects = projectSettingsFixture,
  loading = false,
  error,
  showAdmin = false,
  initialAccountDialogOpen = false,
  initialRenameProjectId = null,
}: SettingsScreenProps) {
  // Storybook demo state only — `apps/console`'s real dialog drafts live in
  // `use-settings-screen.ts`'s own sanctioned local state.
  const [accountDialogOpen, setAccountDialogOpen] = useState(initialAccountDialogOpen);
  const [accountName, setAccountName] = useState(account?.name ?? '');
  const [renameProjectId, setRenameProjectId] = useState<string | null>(initialRenameProjectId);
  const renameTarget = projects.find((project) => project.id === renameProjectId) ?? null;
  const [projectName, setProjectName] = useState(renameTarget?.name ?? '');

  return (
    <ConsoleShell
      header={storyHeader}
      nav={{
        items: storyNavItems('settings'),
        adminItems: storyAdminNavItems('settings'),
        showAdmin,
      }}
      leftSecondary={
        <RailPanel label="SETTINGS">
          <SubNav items={settingsSubNavItems} />
        </RailPanel>
      }
      leftSecondaryLabel="Settings">
      <div className="flex flex-col gap-6">
        <ScreenHeading
          title="Settings"
          subline="Account and project configuration. Filtering and browsing live on Manage."
        />

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

        <ProjectSettings
          projects={projects}
          loading={loading}
          error={error}
          onRetry={() => {}}
          onRename={(project) => {
            setProjectName(project.name);
            setRenameProjectId(project.id);
          }}
        />
      </div>

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

      <ProjectNameDialog
        open={renameTarget !== null}
        projectId={renameTarget?.id ?? ''}
        currentName={renameTarget?.name ?? ''}
        name={projectName}
        onNameChange={setProjectName}
        submitting={false}
        canSubmit={projectName.trim().length > 0 && projectName.trim() !== renameTarget?.name}
        onSubmit={() => setRenameProjectId(null)}
        onCancel={() => setRenameProjectId(null)}
      />
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

export const Empty: Story = {
  name: 'No projects yet — an inline line under a rendered heading',
  render: () => <SettingsScreen projects={[]} />,
};

export const Loading: Story = { render: () => <SettingsScreen projects={[]} loading /> };

export const ErrorState: Story = {
  render: () => <SettingsScreen projects={[]} error="Could not load projects." />,
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
 * now lives on the screen that owns account identity, first block on the page.
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
 * been named. The panel names the absence and offers "Name this account"; the rows beneath still
 * carry the id, status and tier, because those are known regardless.
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
 * Interaction rather than a static arg set, because the thing worth pinning is that the panel's
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

export const RenameProjectDialogOpen: Story = {
  name: 'Project — rename dialog open',
  render: () => <SettingsScreen initialRenameProjectId="proj_b93e1d55" />,
};

/** Driven through the row's own control, which is what makes the per-row targeting real. */
export const RenameProjectFlow: Story = {
  name: 'Project — rename flow, driven',
  render: () => <SettingsScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Rename batch-eval' }));

    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Rename project');
    // The dialog opened on the row that was pressed, not on the first project on the page.
    await expect(dialog).toHaveTextContent('proj_b93e1d55');

    const field = within(dialog).getByLabelText('Project name');
    await userEvent.clear(field);
    await userEvent.type(field, 'batch-eval-v2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save name' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument()
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
