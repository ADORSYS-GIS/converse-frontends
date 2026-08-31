// Page-level acceptance story for `/settings/policies` — "Project policies" — sections composed
// inside `ConsoleShell` with the section fixtures.
//
// IA v3 phase E ("the settings/accounts move", converse-frontends#368) narrowed this screen down
// to exactly what its owner directive keeps: "there's no sense in having account or project
// creation" here. `AccountSettings` (rename + id/status/tier facts) moved to
// `settings-accounts.stories.tsx` (`/settings/accounts/<id>`); `+ New account`/`+ New project`
// both moved off this page's `PageHeader` entirely. What survives is the searchable project
// ledger — still needed as the PICKER `ProjectPolicyControls` acts on — plus the model-policy
// controls themselves, appended inside the SAME detail sheet below `ProjectSettingsDetail`'s
// read-only field list.
//
// No `SubNav`/tab row any more either: the old Account/Projects toggle this file used to render
// is gone along with the second screen it switched to — this page is now the ONE screen its own
// nav row (`settingsNavGroups`'s "Project policies") points at, one level up in the shell.
//
// SETTINGS has **no right rail**, and that is the point of the screen rather than an omission:
// nothing on it retargets on a selection (console-ui skill — "before adding a rail to a screen,
// ask whether its content retargets on selection; if it does not, it is a toolbar").
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { BottomSheet } from '../components/bottom-sheet';
import { ProjectNameDialog } from '../components/project-name-dialog';
import { ProjectSettings, ProjectSettingsDetail } from '../sections/project-settings';
import type { ProjectSettingsRow } from '../sections/project-settings';
import { projectSettingsFixture } from '../sections/project-settings/fixtures';
import { ProjectPolicyControls } from '../sections/project-policy-controls';
import { modelCatalogFixture } from '../sections/project-policy-controls/fixtures';
import type { ModelPolicy } from '../sections/project-policy-controls';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface SettingsScreenProps {
  projects?: ProjectSettingsRow[];
  loading?: boolean;
  error?: string;
  showAdmin?: boolean;
  /** Opens `DetailSheet` on this project on mount, the way `?row=<project id>` does for real. */
  initialSelectedProjectId?: string | null;
  /** Also opens `ProjectNameDialog` on mount, the way `?rename=true` does for real (only
   *  meaningful alongside `initialSelectedProjectId`). */
  initialRenameOpen?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/settings/policies` perform for real.
function SettingsScreen({
  projects = projectSettingsFixture,
  loading = false,
  error,
  showAdmin = false,
  initialSelectedProjectId = null,
  initialRenameOpen = false,
}: SettingsScreenProps) {
  // Storybook demo state only — `apps/console`'s real drafts live in each hook's own sanctioned
  // local state.
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSelectedProjectId
  );
  const [renameOpen, setRenameOpen] = useState(initialRenameOpen);
  const [search, setSearch] = useState('');
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const renameTarget = renameOpen ? selectedProject : null;
  const [projectName, setProjectName] = useState(renameTarget?.name ?? '');

  // The project's OWN model-policy draft — a real, per-project write, not a fixture prop.
  const [modelPolicy, setModelPolicy] = useState<string>('allow_all');
  const [allowedModels, setAllowedModels] = useState<string[]>([]);

  return (
    <ConsoleShell sidebar={storySidebar('settings', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Project policies" subtitle="adorsys-gis" />

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
              setModelPolicy(project.modelPolicy);
              setAllowedModels([]);
            }}
          />
        </Card>

        <BottomSheet
          open={selectedProject !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProjectId(null);
              setRenameOpen(false);
            }
          }}
          title={selectedProject?.name ?? ''}
          subtitle={selectedProject?.status}
          headerAction={
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
          {selectedProject ? (
            <div className="flex flex-col gap-6">
              <ProjectSettingsDetail project={selectedProject} />
              <ProjectPolicyControls
                modelPolicy={modelPolicy}
                onModelPolicyChange={(value: ModelPolicy) => setModelPolicy(value)}
                allowedModels={allowedModels}
                onAllowedModelsChange={setAllowedModels}
                catalog={modelCatalogFixture}
              />
            </div>
          ) : null}
        </BottomSheet>

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
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof SettingsScreen> = {
  title: 'Pages/Settings/ProjectPolicies',
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

export const Loading: Story = {
  render: () => <SettingsScreen projects={[]} loading />,
};

export const ErrorState: Story = {
  render: () => <SettingsScreen projects={[]} error="Could not load projects." />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Refills queue row visible)',
  render: () => <SettingsScreen showAdmin />,
};

// ── the project rename + policy flow ─────────────────────────────────────────────────────────

/** A project row's click opens `DetailSheet` with its full field list AND the model-policy
 *  controls below it — the WHOLE point of this page now. */
export const ProjectDetailOpen: Story = {
  name: 'Project — detail sheet open, policy controls included',
  render: () => <SettingsScreen initialSelectedProjectId="proj_b93e1d55" />,
};

export const RenameProjectDialogOpen: Story = {
  name: 'Project — rename dialog open, stacked on the sheet',
  render: () => <SettingsScreen initialSelectedProjectId="proj_b93e1d55" initialRenameOpen />,
};

/** Driven through the sheet's own footer control, which is what makes the sheet-first targeting
 *  real: the row opens the sheet, the sheet's Rename button opens the dialog. */
export const RenameProjectFlow: Story = {
  name: 'Project — rename flow, driven',
  render: () => <SettingsScreen />,
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

/** The model-policy controls render inside the SAME sheet, below the read-only field list — not
 *  a second sheet, not a separate route. */
export const ModelPolicyFlow: Story = {
  name: 'Project — model policy controls, driven',
  render: () => <SettingsScreen initialSelectedProjectId="proj_b93e1d55" />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const region = await body.findByRole('region', { name: 'Model access policy' });
    expect(region).toBeInTheDocument();
  },
};

// `md` tier (600–1024): the persistent left rail returns; there is no right rail to dock, and no
// sheet triggers beyond the ledger's own rows, because this screen has no other rail sections.
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
