import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
      accounts={[account]}
      projects={[project]}
      selectedAccountId="acc-1"
      selectedProjectId="proj-1"
      project={project}
      onSelectAccount={noop}
      onSelectProject={noop}
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
});
