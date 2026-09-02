import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Review, Task } from '../lib/domain/tasks';
import type { ApiResult } from '../lib/server/api';
import { RunDetailCentre } from './run-detail-centre';

const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1118',
    repository_id: 3,
    installation_id: 1,
    webhook_delivery_id: null,
    target_type: 'pull_request',
    target_id: 1118,
    command_text: 'review',
    base_sha: null,
    head_sha: null,
    status: 'failed',
    priority: 0,
    created_at: new Date(NOW - 3_600_000).toISOString(),
    started_at: new Date(NOW - 3_600_000).toISOString(),
    completed_at: new Date(NOW - 3_500_000).toISOString(),
    repo_owner: 'octonaut',
    repo_name: 'octonaut-svc-03',
    repo_default_branch: 'main',
    repo_platform: 'github',
    job_name: 'task-3b9285de',
    error_detail: null,
    ...overrides,
  };
}

function baseReview(overrides: Partial<Review> = {}): Review {
  return {
    task_id: 'task-1118',
    summary: 'Looks fine.',
    body: '',
    inline_count: 1,
    deferred_count: 0,
    out_of_scope_count: 0,
    findings: [],
    review_url: null,
    created_at: new Date(NOW - 3_500_000).toISOString(),
    ...overrides,
  };
}

describe('RunDetailCentre', () => {
  it('a FAILED task query renders an error line, never a fabricated run', () => {
    render(
      <RunDetailCentre
        taskResult={{ ok: false, reason: 'unavailable' } as ApiResult<Task | null>}
        reviewResult={null}
        now={NOW}
      />
    );

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
  });

  it('renders nothing for a not-found task (ok, null data)', () => {
    const { container } = render(
      <RunDetailCentre taskResult={{ ok: true, data: null }} reviewResult={null} now={NOW} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the real trigger, repository, status, and duration for a found task', () => {
    render(
      <RunDetailCentre
        taskResult={{ ok: true, data: baseTask() }}
        reviewResult={{ ok: true, data: null }}
        now={NOW}
      />
    );

    expect(screen.getByText('review · PR #1118')).toBeInTheDocument();
    expect(screen.getByText(/octonaut\/octonaut-svc-03/)).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/task-3b9285de/)).toBeInTheDocument();
  });

  it('a completed run with no posted review reads as such, not as an empty/broken review', () => {
    render(
      <RunDetailCentre
        taskResult={{ ok: true, data: baseTask({ status: 'succeeded' }) }}
        reviewResult={{ ok: true, data: null }}
        now={NOW}
      />
    );

    expect(screen.getByText('This run completed without posting a review.')).toBeInTheDocument();
  });

  it('an in-progress run with no review yet reads as "not completed", not as a failure', () => {
    render(
      <RunDetailCentre
        taskResult={{ ok: true, data: baseTask({ status: 'running' }) }}
        reviewResult={{ ok: true, data: null }}
        now={NOW}
      />
    );

    expect(screen.getByText('No review yet — this run has not completed.')).toBeInTheDocument();
  });

  it('renders the real persisted review when one exists', () => {
    render(
      <RunDetailCentre
        taskResult={{ ok: true, data: baseTask() }}
        reviewResult={{ ok: true, data: baseReview() }}
        now={NOW}
      />
    );

    expect(screen.getByText('Looks fine.')).toBeInTheDocument();
  });

  it('a FAILED review query renders its own error line, independent of the task', () => {
    render(
      <RunDetailCentre
        taskResult={{ ok: true, data: baseTask() }}
        reviewResult={{ ok: false, reason: 'error' }}
        now={NOW}
      />
    );

    expect(screen.getByText("Couldn't load the review for this run.")).toBeInTheDocument();
  });
});
