import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { NO_PROJECTS_MESSAGE, ProjectSettings } from './component';
import {
  defaultProjectFixture,
  projectSettingsFixture,
  suspendedProjectFixture,
  untieredProjectFixture,
} from './fixtures';

function props(
  overrides: Partial<React.ComponentProps<typeof ProjectSettings>> = {}
): React.ComponentProps<typeof ProjectSettings> {
  return {
    projects: projectSettingsFixture,
    onRename: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe('ProjectSettings', () => {
  it('renders only settings a Project actually carries', () => {
    render(<ProjectSettings {...props({ projects: [defaultProjectFixture] })} />);

    for (const term of [
      'Project id',
      'Billing identity',
      'Billing plan',
      'Quota tier',
      'Model policy',
      'Status',
      'Default project',
    ]) {
      expect(screen.getByText(term)).toBeInTheDocument();
    }

    // `Project` has no currency column of any kind, and the list endpoint returns neither the
    // member roster nor the key set — so a spend, budget, member or key row could only be
    // fabricated (the correction issue #270 already made to the Manage ledger).
    for (const absent of ['Spend', 'Budget', 'Members', 'Keys']) {
      expect(screen.queryByText(absent)).not.toBeInTheDocument();
    }
  });

  it('renders the quota tier as a catalogue id, never coerced into a number', () => {
    render(<ProjectSettings {...props({ projects: [defaultProjectFixture] })} />);

    expect(screen.getByText('scale')).toBeInTheDocument();
  });

  it('names an unassigned tier rather than printing zero, unlimited or an em dash', () => {
    render(<ProjectSettings {...props({ projects: [untieredProjectFixture] })} />);

    expect(screen.getByText(NO_QUOTA_TIER_LABEL)).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders status as text, never as a pill', () => {
    const { container } = render(
      <ProjectSettings {...props({ projects: [suspendedProjectFixture] })} />
    );

    expect(screen.getByText('suspended').tagName).toBe('DD');
    expect(container.querySelector('.badge')).toBeNull();
  });

  it('says what the default-project flag means rather than printing a boolean', () => {
    render(<ProjectSettings {...props({ projects: [defaultProjectFixture] })} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();

    render(<ProjectSettings {...props({ projects: [untieredProjectFixture] })} />);
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renames the row it was pressed on, not the first one', () => {
    const onRename = vi.fn();
    render(<ProjectSettings {...props({ onRename })} />);

    screen.getByRole('button', { name: 'Rename batch-eval' }).click();
    expect(onRename).toHaveBeenCalledWith(untieredProjectFixture);
  });

  it('disables renaming with a stated reason rather than failing on submit', () => {
    render(
      <ProjectSettings
        {...props({
          renameDisabled: true,
          renameReason: 'Only the account owner or a project member can rename a project.',
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Rename gateway-prod' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/can rename a project/);
  });

  it('keeps the heading rendered when the list is empty, and states the emptiness inline', () => {
    render(<ProjectSettings {...props({ projects: [] })} />);

    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(NO_PROJECTS_MESSAGE);
  });

  it('distinguishes a failed fetch from an empty list', () => {
    render(<ProjectSettings {...props({ projects: [], error: 'Could not load projects.' })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load projects.');
    expect(screen.queryByText(NO_PROJECTS_MESSAGE)).not.toBeInTheDocument();
  });

  it('retries from the error line', () => {
    const onRetry = vi.fn();
    render(<ProjectSettings {...props({ projects: [], error: 'Boom.', onRetry })} />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders skeleton blocks while loading, and claims nothing', () => {
    const { container } = render(
      <ProjectSettings {...props({ projects: [], loading: true, loadingRowCount: 4 })} />
    );

    expect(container.querySelectorAll('[role="presentation"]')).toHaveLength(4);
    expect(screen.queryByText(NO_PROJECTS_MESSAGE)).not.toBeInTheDocument();
  });
});
