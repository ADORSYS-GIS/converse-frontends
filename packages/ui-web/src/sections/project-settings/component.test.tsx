import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { NO_PROJECTS_MESSAGE, ProjectSettings, ProjectSettingsDetail } from './component';
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
    onSelectRow: vi.fn(),
    onRetry: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    ...overrides,
  };
}

// The full field list a `DetailSheet` renders once a row is opened (phase 9, Addition C — moved
// out of `ProjectSettings` itself, which now renders a summary row per project rather than every
// project's full column at once).
describe('ProjectSettingsDetail', () => {
  it('renders only settings a Project actually carries', () => {
    render(<ProjectSettingsDetail project={defaultProjectFixture} />);

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
    render(<ProjectSettingsDetail project={defaultProjectFixture} />);

    expect(screen.getByText('scale')).toBeInTheDocument();
  });

  it('names an unassigned tier rather than printing zero, unlimited or an em dash', () => {
    render(<ProjectSettingsDetail project={untieredProjectFixture} />);

    expect(screen.getByText(NO_QUOTA_TIER_LABEL)).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders status as text, never as a pill', () => {
    const { container } = render(<ProjectSettingsDetail project={suspendedProjectFixture} />);

    expect(screen.getByText('suspended').tagName).toBe('DD');
    expect(container.querySelector('.badge')).toBeNull();
  });

  it('says what the default-project flag means rather than printing a boolean', () => {
    const { rerender } = render(<ProjectSettingsDetail project={defaultProjectFixture} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();

    rerender(<ProjectSettingsDetail project={untieredProjectFixture} />);
    expect(screen.getByText('No')).toBeInTheDocument();
  });
});

describe('ProjectSettings', () => {
  it('renders one summary row per project — name, then a status/tier line, no full field grid inline', () => {
    render(<ProjectSettings {...props({ projects: [defaultProjectFixture] })} />);

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('active · scale')).toBeInTheDocument();
    // The full field list moved to `ProjectSettingsDetail` — a row is a summary, not a grid.
    expect(screen.queryByText('Billing identity')).not.toBeInTheDocument();
  });

  it('opens the row it was pressed on, not the first one', () => {
    const onSelectRow = vi.fn();
    render(<ProjectSettings {...props({ onSelectRow })} />);

    screen.getByRole('button', { name: /batch-eval/ }).click();
    expect(onSelectRow).toHaveBeenCalledWith(untieredProjectFixture);
  });

  it('marks the open row current', () => {
    render(<ProjectSettings {...props({ selectedProjectId: untieredProjectFixture.id })} />);

    expect(screen.getByRole('button', { name: /batch-eval/ })).toHaveAttribute(
      'data-current',
      'true'
    );
    expect(screen.getByRole('button', { name: /gateway-prod/ })).not.toHaveAttribute(
      'data-current',
      'true'
    );
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

  it('carries a search field that reports typed input through the caller', () => {
    const onSearchChange = vi.fn();
    render(<ProjectSettings {...props({ onSearchChange })} />);

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'gateway' } });
    expect(onSearchChange).toHaveBeenCalledWith('gateway');
  });

  it('distinguishes a search that narrowed the list to nothing from an empty account', () => {
    render(
      <ProjectSettings
        {...props({ projects: [], search: 'nonexistent', filteredEmptyMessage: 'No projects match “nonexistent”.' })}
      />
    );

    expect(screen.getByText('No projects match “nonexistent”.')).toBeInTheDocument();
    expect(screen.queryByText(NO_PROJECTS_MESSAGE)).not.toBeInTheDocument();
  });

  it('never renders a pagination row with nothing wired', () => {
    render(<ProjectSettings {...props()} />);

    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
  });

  it('renders a real, clickable pagination row when the container wires a further page', () => {
    const onNext = vi.fn();
    render(
      <ProjectSettings
        {...props({ pagination: { shown: 3, hasPrev: false, hasNext: true, onNext } })}
      />
    );

    const next = screen.getByRole('button', { name: /Next/ });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
