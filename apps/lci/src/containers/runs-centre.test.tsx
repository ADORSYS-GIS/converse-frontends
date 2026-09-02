import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { Task } from '../lib/domain/tasks';
import type { ApiResult, TasksPageResponse } from '../lib/server/api';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const { RunsCentre } = await import('./runs-centre');

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
    head_sha: null,
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

function renderCentre(result: ApiResult<TasksPageResponse>, now = NOW) {
  return render(<RunsCentre result={result} now={now} />, { wrapper: withNuqsTestingAdapter() });
}

describe('RunsCentre', () => {
  it('a FAILED runs query renders an error line, never a fabricated table', () => {
    renderCentre({ ok: false, reason: 'unavailable' });

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an honest "no runs match" message on a real empty result', () => {
    renderCentre({ ok: true, data: { tasks: [], total: 0 } });

    expect(screen.getByText('No runs match the current filters.')).toBeInTheDocument();
  });

  it('renders real run rows with their trigger and repository', () => {
    renderCentre({ ok: true, data: { tasks: [baseTask()], total: 1 } });

    expect(screen.getByText('review · PR #42')).toBeInTheDocument();
    expect(screen.getByText('acme/widgets')).toBeInTheDocument();
  });

  it('navigates to the run detail page when a row is selected', async () => {
    const user = userEvent.setup();
    renderCentre({ ok: true, data: { tasks: [baseTask({ id: 'task-99' })], total: 1 } });

    await user.click(screen.getByText('review · PR #42'));

    expect(pushMock).toHaveBeenCalledWith('/runs/task-99');
  });

  it('offers a status filter option for every real outcome', () => {
    renderCentre({ ok: true, data: { tasks: [], total: 0 } });

    for (const label of ['All', 'Running', 'Pending', 'Succeeded', 'Failed', 'Cancelled']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('renders the real total below the table, not just the current page size', () => {
    renderCentre({ ok: true, data: { tasks: [baseTask()], total: 235 } });

    expect(screen.getAllByText(/of 235/).length).toBeGreaterThan(0);
  });
});
