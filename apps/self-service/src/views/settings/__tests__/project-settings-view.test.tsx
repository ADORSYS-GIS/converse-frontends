import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { Account, Project } from '@lightbridge/hooks';

import { parseLimitDraft, ProjectSettingsView } from '../project-settings-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

const account: Account = {
  id: 'acc-1',
  defaultQuota: 't-m',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const project: Project = {
  id: 'proj-1',
  accountId: 'acc-1',
  name: 'production',
  billingPlan: 'free',
  billingIdentity: 'acme-inc',
  projectQuota: undefined,
  allowedModels: ['gpt-4o'],
  defaultLimits: { requests_per_second: 5, requests_per_day: null, concurrent_requests: null },
  status: 'active',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

function renderView(overrides: Partial<React.ComponentProps<typeof ProjectSettingsView>> = {}) {
  return render(
    <ProjectSettingsView
      onBack={noop}
      onAddMember={noop}
      onRemoveMember={noop}
      onSetMemberRole={noop}
      onSetMemberQuotaTier={noop}
      accounts={[account]}
      projects={[project]}
      selectedAccountId="acc-1"
      selectedProjectId="proj-1"
      project={project}
      onSelectAccount={noop}
      onSelectProject={noop}
      onOpenAccountPicker={noop}
      onOpenProjectPicker={noop}
      onCreateProject={noop}
      onSaveDetails={noop}
      onAddModel={noop}
      onRemoveModel={noop}
      onSaveLimits={noop}
      onDeleteProject={noop}
      onSuspendProject={noop}
      onEnableProject={noop}
      onSetDefaultProject={noop}
      {...overrides}
    />
  );
}

describe('parseLimitDraft', () => {
  it('maps an empty draft to null (no limit)', () => {
    expect(parseLimitDraft('')).toBeNull();
    expect(parseLimitDraft('   ')).toBeNull();
  });

  it('parses non-negative integers', () => {
    expect(parseLimitDraft('0')).toBe(0);
    expect(parseLimitDraft(' 42 ')).toBe(42);
  });

  it('rejects non-integer input as undefined (invalid)', () => {
    expect(parseLimitDraft('-1')).toBeUndefined();
    expect(parseLimitDraft('1.5')).toBeUndefined();
    expect(parseLimitDraft('abc')).toBeUndefined();
  });
});

describe('ProjectSettingsView', () => {
  it('renders the selected project details, models, and limits', async () => {
    await renderView();

    expect(screen.getByDisplayValue('production')).toBeTruthy();
    expect(screen.getByDisplayValue('free')).toBeTruthy();
    expect(screen.getByText('gpt-4o')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('disables Save until the project details are actually changed', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(screen.getByDisplayValue('production'), 'production-2');

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('calls onSaveDetails with the trimmed values', async () => {
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent.changeText(screen.getByDisplayValue('production'), '  production-2  ');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({ name: 'production-2', billingPlan: 'free' });
  });

  it('calls onAddModel with the trimmed model id', async () => {
    const onAddModel = jest.fn();
    await renderView({ onAddModel });

    await fireEvent.changeText(
      screen.getByPlaceholderText('gpt-4o, claude-sonnet-5, ...'),
      '  claude-sonnet-5  '
    );
    await fireEvent.press(screen.getByText('Add'));

    expect(onAddModel).toHaveBeenCalledWith('claude-sonnet-5');
  });

  it('calls onRemoveModel when a model chip is removed', async () => {
    const onRemoveModel = jest.fn();
    await renderView({ onRemoveModel });

    await fireEvent.press(screen.getByLabelText('Remove gpt-4o'));

    expect(onRemoveModel).toHaveBeenCalledWith('gpt-4o');
  });

  it('shows the all-models-allowed note when the allowlist is empty', async () => {
    await renderView({ project: { ...project, allowedModels: [] } });

    expect(screen.getByText('All models are allowed.')).toBeTruthy();
  });

  it('shows the allowlist-enforcement notice for a project with a non-empty allowlist', async () => {
    await renderView();

    await waitFor(() => expect(screen.getByText(/this allowlist is now enforced/)).toBeTruthy());
  });

  it('never shows the allowlist-enforcement notice for a project with an empty allowlist', async () => {
    await renderView({ project: { ...project, allowedModels: [] } });

    // Give any pending storage-read effects a turn — the notice must stay
    // absent either way, since an empty allowlist means nothing changed.
    await waitFor(() => expect(screen.getByText('All models are allowed.')).toBeTruthy());
    expect(screen.queryByText(/this allowlist is now enforced/)).toBeNull();
  });

  it('calls onSaveLimits with parsed limits, mapping empty drafts to null', async () => {
    const onSaveLimits = jest.fn();
    await renderView({ onSaveLimits });

    await fireEvent.changeText(screen.getByDisplayValue('5'), '10');
    await fireEvent.press(screen.getByText('Save limits'));

    expect(onSaveLimits).toHaveBeenCalledWith({
      requests_per_second: 10,
      requests_per_day: null,
      concurrent_requests: null,
    });
  });

  it('disables Save limits when a draft is not a valid integer', async () => {
    await renderView();

    await fireEvent.changeText(screen.getByDisplayValue('5'), 'abc');

    expect(
      screen.getByRole('button', { name: 'Save limits' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('calls onDeleteProject when the danger-zone button is pressed', async () => {
    const onDeleteProject = jest.fn();
    await renderView({ onDeleteProject });

    await fireEvent.press(screen.getByText('Delete project'));

    expect(onDeleteProject).toHaveBeenCalledTimes(1);
  });

  it('shows a Set as default action and an enabled Delete button for a non-default project', async () => {
    const onSetDefaultProject = jest.fn();
    await renderView({ onSetDefaultProject });

    await fireEvent.press(screen.getByText('Set as default'));
    expect(onSetDefaultProject).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole('button', { name: 'Delete project' }).props.accessibilityState.disabled
    ).toBe(false);
  });

  it('replaces the Set as default action with a badge and disables Delete for the default project', async () => {
    await renderView({ project: { ...project, isDefault: true } });

    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.queryByText('Set as default')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Delete project' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('renders the empty state with a create action when there is no project', async () => {
    const onCreateProject = jest.fn();
    await renderView({ projects: [], project: undefined, onCreateProject });

    expect(
      screen.getAllByText('No projects in this account yet. Create one to get started.')
    ).toBeTruthy();

    await fireEvent.press(
      screen.getAllByLabelText('New project')[screen.getAllByLabelText('New project').length - 1]
    );

    expect(onCreateProject).toHaveBeenCalled();
  });

  it("renders the roster with each member's role and quota tier", async () => {
    await renderView({
      members: [
        {
          id: 'proj-1:sub-lead',
          projectId: 'proj-1',
          accountId: 'sub-lead',
          role: 'lead',
          quotaTier: 't-m',
          createdAt: '',
        },
        {
          id: 'proj-1:sub-plain',
          projectId: 'proj-1',
          accountId: 'sub-plain',
          role: 'member',
          quotaTier: null,
          createdAt: '',
        },
      ],
    });

    expect(screen.getByText('sub-lead')).toBeTruthy();
    expect(screen.getByText('sub-plain')).toBeTruthy();
    expect(screen.getByText('Lead')).toBeTruthy();
    expect(screen.getByDisplayValue('t-m')).toBeTruthy();
  });

  it('explains that a default project has no roster instead of showing an empty one', async () => {
    await renderView({ project: { ...project, isDefault: true }, members: [] });

    expect(
      screen.getByText(
        'This is your personal project — it has no members by design. Create a separate project to work with others.'
      )
    ).toBeTruthy();
    // No add control at all — the roster is structurally absent, not merely empty.
    expect(screen.queryByPlaceholderText('Account ID')).toBeNull();
  });

  it('adds a member as a plain member, leaving promotion a separate action', async () => {
    const onAddMember = jest.fn();
    await renderView({ onAddMember });

    await fireEvent.changeText(screen.getByPlaceholderText('Account ID'), '  sub-new  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Add member' }));

    expect(onAddMember).toHaveBeenCalledWith('sub-new', 'member');
  });

  it('toggles a member between lead and member', async () => {
    const onSetMemberRole = jest.fn();
    await renderView({
      members: [
        {
          id: 'proj-1:sub-plain',
          projectId: 'proj-1',
          accountId: 'sub-plain',
          role: 'member',
          quotaTier: null,
          createdAt: '',
        },
      ],
      onSetMemberRole,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Make lead' }));

    expect(onSetMemberRole).toHaveBeenCalledWith('sub-plain', 'lead');
  });

  it('surfaces a server-side lead-gating rejection', async () => {
    // project:member is necessary but not sufficient — the server also requires ownership or
    // role=lead, so the UI must show the 403 rather than silently doing nothing.
    await renderView({ memberError: 'Forbidden: only a project lead may change the roster' });

    expect(screen.getByText('Forbidden: only a project lead may change the roster')).toBeTruthy();
  });

  it('hides the members section entirely without the project:member capability', async () => {
    await renderView({ canManageMembers: false });

    expect(screen.queryByPlaceholderText('Account ID')).toBeNull();
  });

  /**
   * Regression coverage for the same class of bug as `AccountSettingsView`'s
   * `TypeError: f.trim is not a function` production incident (`f` was `defaultQuota`, itself an
   * RPC-sourced optional string reaching `.trim()` unguarded). `project.name`/`project.billingPlan`
   * are declared non-nullable strings, but they cross the same unchecked `as Project` cast the
   * generated RPC client applies to every response, so nothing actually guarantees they arrive as
   * strings at runtime either -- `as unknown as string` below simulates a value that violates that
   * assumption despite what TypeScript believes.
   */
  it('does not crash when project name/billingPlan arrive as non-string values', async () => {
    await renderView({
      project: {
        ...project,
        name: 42 as unknown as string,
        billingPlan: false as unknown as string,
      },
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  /** Same shape, for a roster member's `quotaTier` (`ProjectMember.quotaTier: string | null`). */
  it('does not crash when a member quotaTier arrives as a non-string value', async () => {
    await renderView({
      members: [
        {
          id: 'proj-1:sub-lead',
          projectId: 'proj-1',
          accountId: 'sub-lead',
          role: 'lead',
          quotaTier: 7 as unknown as string,
          createdAt: '',
        },
      ],
    });

    expect(screen.getByText('sub-lead')).toBeTruthy();
  });
});
