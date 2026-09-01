import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ApiResult } from '../lib/server/api';
import type { Task } from '../lib/domain/tasks';
import { OverviewCentre } from './overview-centre';

const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    repository_id: 1,
    installation_id: 1,
    webhook_delivery_id: null,
    target_type: 'pull_request',
    target_id: 42,
    command_text: 'review',
    base_sha: null,
    head_sha: 'abcdef1234567890',
    status: 'succeeded',
    priority: 0,
    created_at: new Date(NOW - 3600_000).toISOString(),
    started_at: new Date(NOW - 3600_000).toISOString(),
    completed_at: new Date(NOW - 3500_000).toISOString(),
    repo_owner: 'acme',
    repo_name: 'widgets',
    repo_default_branch: 'main',
    repo_platform: 'github',
    job_name: null,
    error_detail: null,
    ...overrides,
  };
}

describe('OverviewCentre', () => {
  it('a FAILED runs query renders an error line, never a fabricated zero-run dashboard', () => {
    render(
      <OverviewCentre
        result={{ ok: false, reason: 'unavailable' } as ApiResult<Task[]>}
        now={NOW}
      />
    );

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
    expect(screen.queryByText('Total runs')).not.toBeInTheDocument();
  });

  it('renders an honest empty state, with no runs, when the query succeeded with zero tasks', () => {
    render(<OverviewCentre result={{ ok: true, data: [] }} now={NOW} />);

    expect(screen.getByText('No task runs yet.')).toBeInTheDocument();
    expect(screen.getByText('No runs in the last 14 days.')).toBeInTheDocument();
    // The stat row still renders real zeros, not an error or a blank.
    expect(screen.getByText('Total runs')).toBeInTheDocument();
  });

  it('renders real KPIs, breakdowns, and recent runs from real task data', () => {
    const tasks: Task[] = [
      baseTask({ id: 'task-1', status: 'succeeded' }),
      baseTask({ id: 'task-2', status: 'failed', repo_owner: 'acme', repo_name: 'gadgets' }),
      baseTask({ id: 'task-3', status: 'running' }),
    ];

    render(<OverviewCentre result={{ ok: true, data: tasks }} now={NOW} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // total runs
    expect(screen.getAllByText('acme/widgets').length).toBeGreaterThan(0);
    expect(screen.getAllByText('acme/gadgets').length).toBeGreaterThan(0);
    // Each outcome shows up twice: once in the "By outcome" breakdown, once as a recent run's status.
    expect(screen.getAllByText('Succeeded').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
  });

  it('links each recent run to its own detail page, and "View all" to the Runs list', () => {
    render(<OverviewCentre result={{ ok: true, data: [baseTask({ id: 'task-99' })] }} now={NOW} />);

    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/runs');
    expect(
      screen.getAllByRole('link').some((el) => el.getAttribute('href') === '/runs/task-99')
    ).toBe(true);
  });
});
