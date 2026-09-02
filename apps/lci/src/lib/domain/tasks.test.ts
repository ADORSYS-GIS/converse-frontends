import { describe, expect, it } from 'vitest';

import {
  absoluteTime,
  duration,
  durationSeconds,
  failureNoticePrefix,
  relativeTime,
  repoLabel,
  shortSha,
  statusOutcome,
  statusTone,
  type Task,
  triggerLabel,
} from './tasks';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
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
    created_at: '2026-01-01T00:00:00.000Z',
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-01T00:01:40.000Z',
    repo_owner: 'acme',
    repo_name: 'widgets',
    repo_default_branch: 'main',
    repo_platform: 'github',
    job_name: null,
    error_detail: null,
    ...overrides,
  };
}

describe('statusOutcome', () => {
  it('groups pending-ish statuses as pending', () => {
    expect(statusOutcome('received')).toBe('pending');
    expect(statusOutcome('waiting_for_index')).toBe('pending');
    expect(statusOutcome('queued')).toBe('pending');
  });

  it('groups in-flight statuses as active', () => {
    expect(statusOutcome('running')).toBe('active');
    expect(statusOutcome('posting_result')).toBe('active');
  });

  it('maps succeeded to success and failed/timed_out to error', () => {
    expect(statusOutcome('succeeded')).toBe('success');
    expect(statusOutcome('failed')).toBe('error');
    expect(statusOutcome('timed_out')).toBe('error');
  });

  it('maps cancelled to muted and an unknown status to pending', () => {
    expect(statusOutcome('cancelled')).toBe('muted');
    expect(statusOutcome('something_new')).toBe('pending');
  });
});

describe('statusTone', () => {
  it('never gives a completed run a distinct "success" colour', () => {
    expect(statusTone('succeeded')).toEqual({ tone: 'active', label: 'Succeeded' });
  });

  it('flags failed and timed-out runs as attention', () => {
    expect(statusTone('failed').tone).toBe('attention');
    expect(statusTone('timed_out').tone).toBe('attention');
  });

  it('falls back to the raw status string as the label for an unknown status', () => {
    expect(statusTone('mystery')).toEqual({ tone: 'muted', label: 'mystery' });
  });
});

describe('repoLabel', () => {
  it('renders owner/name when the repo join succeeded', () => {
    expect(repoLabel(makeTask())).toBe('acme/widgets');
  });

  it('falls back to a stable id-based label when the join is empty', () => {
    expect(repoLabel(makeTask({ repo_owner: null, repo_name: null, repository_id: 7 }))).toBe(
      'repo #7'
    );
  });
});

describe('triggerLabel', () => {
  it('labels a GitHub pull request as PR #n', () => {
    expect(triggerLabel(makeTask({ target_type: 'pull_request', target_id: 5 }))).toBe(
      'review · PR #5'
    );
  });

  it('labels a GitLab pull request as MR #n', () => {
    expect(
      triggerLabel(makeTask({ target_type: 'pull_request', target_id: 5, repo_platform: 'gitlab' }))
    ).toBe('review · MR #5');
  });

  it('labels a non-pull-request target generically', () => {
    expect(
      triggerLabel(makeTask({ command_text: 'index', target_type: 'repository', target_id: 12 }))
    ).toBe('index · repository #12');
  });
});

describe('failureNoticePrefix', () => {
  it('distinguishes an indexing failure from a review that failed to post', () => {
    expect(failureNoticePrefix(makeTask({ target_type: 'repository' }))).toBe('Indexing failed');
    expect(failureNoticePrefix(makeTask({ target_type: 'pull_request' }))).toBe(
      'Review did not post'
    );
  });
});

describe('shortSha', () => {
  it('truncates to 7 characters, or passes null through', () => {
    expect(shortSha('abcdef1234567890')).toBe('abcdef1');
    expect(shortSha(null)).toBeNull();
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-01-01T00:10:00.000Z').getTime();

  it('renders a past timestamp in minutes', () => {
    expect(relativeTime('2026-01-01T00:05:00.000Z', now)).toBe('5 minutes ago');
  });

  it('falls back to a stable label for an unparseable timestamp', () => {
    expect(relativeTime('not-a-date', now)).toBe('unknown time');
  });
});

describe('absoluteTime', () => {
  it('falls back to an em dash for an unparseable timestamp', () => {
    expect(absoluteTime('not-a-date')).toBe('—');
  });

  it('formats a valid timestamp as non-empty text', () => {
    expect(absoluteTime('2026-01-01T00:00:00.000Z').length).toBeGreaterThan(0);
  });
});

describe('durationSeconds / duration', () => {
  it('is null for a run that has not started', () => {
    const task = makeTask({ started_at: null, completed_at: null });
    expect(durationSeconds(task)).toBeNull();
    expect(duration(task)).toBeNull();
  });

  it('measures against now for a run still in flight', () => {
    const task = makeTask({
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
    });
    const now = new Date('2026-01-01T00:02:00.000Z').getTime();
    expect(durationSeconds(task, now)).toBe(120);
    expect(duration(task, now)).toBe('2m');
  });

  it('formats seconds/minutes/hours the way a reader expects', () => {
    expect(
      duration(
        makeTask({
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T00:00:45.000Z',
        })
      )
    ).toBe('45s');
    expect(
      duration(
        makeTask({
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T00:01:40.000Z',
        })
      )
    ).toBe('1m 40s');
    expect(
      duration(
        makeTask({
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T01:30:00.000Z',
        })
      )
    ).toBe('1h 30m');
  });
});
