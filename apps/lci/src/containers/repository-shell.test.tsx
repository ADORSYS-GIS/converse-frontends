import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Repository } from '../lib/domain/repos';

// `RepoTabsNav` has its own dedicated coverage (`repo-tabs-nav.test.tsx`) — stubbed here so this
// file stays focused on the shell's own chrome (title, status, tabs).
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
      <RepositoryShell id={81} repo={baseRepo()}>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.getByText('platform-team/platform-team-repo-21')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByTestId('repo-tabs-nav')).toHaveTextContent('tabs for 81');
    expect(screen.getByText('tab content')).toBeInTheDocument();
  });

  it('offers a way back to the repositories list', () => {
    render(
      <RepositoryShell id={81} repo={baseRepo()}>
        <p>tab content</p>
      </RepositoryShell>
    );

    expect(screen.getByRole('button', { name: '← Repositories' })).toHaveAttribute(
      'href',
      '/repositories'
    );
  });

  it('carries the approval status in the controls row, not on the title row', () => {
    const { container } = render(
      <RepositoryShell id={81} repo={baseRepo({ status: 'pending' })}>
        <p>tab content</p>
      </RepositoryShell>
    );

    const approval = screen.getByRole('group', { name: 'Approval' });
    expect(approval).toContainElement(screen.getByText('Pending approval'));
    expect(approval.closest('.page-controls')).not.toBeNull();
    expect(approval).toHaveAttribute('data-align', 'end');

    const header = container.querySelector('.page-header');
    expect(header).not.toBeNull();
    expect(header).toHaveTextContent('platform-team/platform-team-repo-21');
    // The header's one action is the back link, not the approval readout — that lives in the
    // controls row above, asserted separately.
    expect(header).not.toContainElement(screen.getByText('Pending approval'));
  });
});
