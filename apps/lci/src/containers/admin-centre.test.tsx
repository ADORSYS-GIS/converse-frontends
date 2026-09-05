import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { Repository } from '../lib/domain/repos';
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
});
