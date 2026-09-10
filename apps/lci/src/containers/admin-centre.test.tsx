import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import { REPOS_PAGE_SIZE, type Repository } from '../lib/domain/repos';
import type { ApiResult } from '../lib/server/api';

/**
 * `admin-actions.ts` is a Server Action module (reads the session cookie, calls the control
 * plane) — mocked wholesale so this container-level test can assert what the CENTRE renders for
 * a given `ApiResult`, without standing up a request context. The forms below only ever bind
 * these as their `action`; a submit is never simulated here, so a `vi.fn()` stub is sufficient.
 */
vi.mock('./admin-actions', () => ({
  approveRepoAction: vi.fn(),
  denyRepoAction: vi.fn(),
}));

const usePathnameMock = vi.fn(() => '/admin');
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

const { AdminCentre } = await import('./admin-centre');

function baseRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    platform_repo_id: 5000001,
    platform: 'github',
    owner: 'acme',
    name: 'widgets',
    default_branch: 'main',
    status: 'pending',
    active: false,
    approved_at: null,
    approved_by: null,
    task_count: 0,
    last_task_at: null,
    ...overrides,
  };
}

function renderCentre(ui: Parameters<typeof render>[0]) {
  return render(ui, { wrapper: withNuqsTestingAdapter() });
}

describe('AdminCentre', () => {
  it('renders a permission-denied message, not the approvals UI, when result is null', () => {
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={null}
        canApprove={false}
        canDeny={false}
      />
    );

    expect(
      screen.getByText(
        'You need the repo:approve or repo:deny permission to manage repository approvals. Ask an administrator to grant it.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pending' })).not.toBeInTheDocument();
  });

  it('a FAILED repositories query renders an error line, never a fabricated empty list', () => {
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{ ok: false, reason: 'unavailable' } as ApiResult<Repository[]>}
        canApprove
        canDeny
      />
    );

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
  });

  it('renders an honest empty message when there are no repositories for this status', () => {
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{ ok: true, data: [] }}
        canApprove
        canDeny
      />
    );

    expect(screen.getByText('No pending repositories.')).toBeInTheDocument();
  });

  it('renders the repositories for this status only', () => {
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{
          ok: true,
          data: [
            baseRepo({ id: 1, name: 'pending-repo', status: 'pending' }),
            baseRepo({ id: 2, name: 'another-pending-repo', status: 'pending' }),
          ],
        }}
        canApprove
        canDeny
      />
    );

    expect(screen.getByText('acme/pending-repo')).toBeInTheDocument();
    expect(screen.getByText('acme/another-pending-repo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending' })).toBeInTheDocument();
  });

  it('shows Approve only when canApprove and the repo is not already approved', () => {
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{ ok: true, data: [baseRepo({ status: 'pending' })] }}
        canApprove={false}
        canDeny={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
  });

  it('an already-approved repo shows Deny but not Approve; a denied one shows Approve but not Deny', () => {
    renderCentre(
      <AdminCentre
        title="Accepted"
        emptyMessage="No accepted repositories."
        result={{
          ok: true,
          data: [
            baseRepo({ id: 1, name: 'approved-repo', status: 'approved' }),
            baseRepo({ id: 2, name: 'denied-repo', status: 'disabled' }),
          ],
        }}
        canApprove
        canDeny
      />
    );

    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Deny' })).toHaveLength(1);
  });

  it('pages a queue larger than one page, and shows the second page on Next', async () => {
    const user = userEvent.setup();
    const repos = Array.from({ length: REPOS_PAGE_SIZE + 3 }, (_, i) =>
      baseRepo({ id: i + 1, name: `repo-${String(i + 1).padStart(2, '0')}` })
    );
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{ ok: true, data: repos }}
        canApprove
        canDeny
      />
    );

    expect(screen.getByText('acme/repo-01')).toBeInTheDocument();
    expect(screen.queryByText(`acme/repo-${REPOS_PAGE_SIZE + 1}`)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText(`acme/repo-${REPOS_PAGE_SIZE + 1}`)).toBeInTheDocument();
    expect(screen.queryByText('acme/repo-01')).not.toBeInTheDocument();
  });

  it('filters the list by a typed query, and names the query in the empty state', async () => {
    const user = userEvent.setup();
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{
          ok: true,
          data: [baseRepo({ id: 1, name: 'widgets' }), baseRepo({ id: 2, name: 'gadgets' })],
        }}
        canApprove
        canDeny
      />
    );

    await user.type(screen.getByPlaceholderText('Search repositories'), 'widg');

    expect(screen.getByText('acme/widgets')).toBeInTheDocument();
    expect(screen.queryByText('acme/gadgets')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search repositories'));
    await user.type(screen.getByPlaceholderText('Search repositories'), 'nothing-matches-this');

    expect(screen.getByText('No repositories match "nothing-matches-this".')).toBeInTheDocument();
  });

  it('resets to the first page when the search query changes', async () => {
    const user = userEvent.setup();
    const repos = Array.from({ length: REPOS_PAGE_SIZE + 3 }, (_, i) =>
      baseRepo({ id: i + 1, name: `repo-${String(i + 1).padStart(2, '0')}` })
    );
    renderCentre(
      <AdminCentre
        title="Pending"
        emptyMessage="No pending repositories."
        result={{ ok: true, data: repos }}
        canApprove
        canDeny
      />
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(`acme/repo-${REPOS_PAGE_SIZE + 1}`)).toBeInTheDocument();

    // Narrowing the query while on page 2 must not leave the reader on a now-invalid page.
    await user.type(screen.getByPlaceholderText('Search repositories'), 'repo-01');

    expect(screen.getByText('acme/repo-01')).toBeInTheDocument();
  });
});
