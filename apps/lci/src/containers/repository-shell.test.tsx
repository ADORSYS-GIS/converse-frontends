import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Repository } from '../lib/domain/repos';

vi.mock('./repository-actions', () => ({
  approveRepoAction: vi.fn(),
  denyRepoAction: vi.fn(),
}));
// `RepoTabsNav` has its own dedicated coverage (`repo-tabs-nav.test.tsx`) — stubbed here so this
// file stays focused on the shell's own chrome (title, status, approve/deny gating).
vi.mock('./repo-tabs-nav', () => ({
  RepoTabsNav: ({ id }: { id: number }) => <nav data-testid="repo-tabs-nav">tabs for {id}</nav>,
}));

const { RepositoryShell } = await import('./repository-shell');

function baseRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 81,
    platform_repo_id: 5000081,
    platform: 'gitlab',
    owner: 'platform-team',
    name: 'platform-team-repo-21',
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

describe('RepositoryShell', () => {
  it('renders the repo slug, its approval status, the tabs nav, and its children', () => {
    render(
      <RepositoryShell id={81} repo={baseRepo()} canApprove={false} canDeny={false}>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.getByText('platform-team/platform-team-repo-21')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByTestId('repo-tabs-nav')).toHaveTextContent('tabs for 81');
    expect(screen.getByText('tab content')).toBeInTheDocument();
  });

  it('shows neither Approve nor Deny without permission', () => {
    render(
      <RepositoryShell
        id={81}
        repo={baseRepo({ status: 'pending' })}
        canApprove={false}
        canDeny={false}>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
  });

  it('shows Approve for a pending repo when canApprove, and Deny when canDeny', () => {
    render(
      <RepositoryShell id={81} repo={baseRepo({ status: 'pending' })} canApprove canDeny>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument();
  });

  it('hides Approve for an already-approved repo even with canApprove, since there is nothing to approve', () => {
    render(
      <RepositoryShell id={81} repo={baseRepo({ status: 'approved' })} canApprove canDeny>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument();
  });

  it('hides Deny for an already-disabled repo even with canDeny, since there is nothing to deny', () => {
    render(
      <RepositoryShell id={81} repo={baseRepo({ status: 'disabled' })} canApprove canDeny>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
  });
});
