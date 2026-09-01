import { describe, expect, it } from 'vitest';

import { approvalTone, type Repository, repoSlug } from './repos';

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    platform_repo_id: 100,
    platform: 'github',
    owner: 'acme',
    name: 'widgets',
    default_branch: 'main',
    status: 'approved',
    active: true,
    approved_at: null,
    approved_by: null,
    task_count: 0,
    last_task_at: null,
    ...overrides,
  };
}

describe('repoSlug', () => {
  it('joins owner and name', () => {
    expect(repoSlug(makeRepo())).toBe('acme/widgets');
  });
});

describe('approvalTone', () => {
  it('reads an approved repo as active, never a distinct "success" colour', () => {
    expect(approvalTone(makeRepo({ status: 'approved' }))).toEqual({
      tone: 'active',
      label: 'Approved',
    });
  });

  it('reads a disabled repo as muted', () => {
    expect(approvalTone(makeRepo({ status: 'disabled' }))).toEqual({
      tone: 'muted',
      label: 'Disabled',
    });
  });

  it('flags a pending repo for attention', () => {
    expect(approvalTone(makeRepo({ status: 'pending' }))).toEqual({
      tone: 'attention',
      label: 'Pending approval',
    });
  });

  it('falls back to the raw status string for an unknown status', () => {
    expect(approvalTone(makeRepo({ status: 'mystery' }))).toEqual({
      tone: 'muted',
      label: 'mystery',
    });
  });
});
