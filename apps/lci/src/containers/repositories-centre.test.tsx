import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { Repository } from '../lib/domain/repos';
import type { ApiResult, RepositoriesPageResponse } from '../lib/server/api';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const { RepositoriesCentre } = await import('./repositories-centre');

function baseRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    platform_repo_id: 5000001,
    platform: 'github',
    owner: 'acme',
    name: 'widgets',
    default_branch: 'main',
    status: 'approved',
    active: true,
    approved_at: null,
    approved_by: null,
    task_count: 4,
    last_task_at: null,
    ...overrides,
  };
}

function basePage(overrides: Partial<RepositoriesPageResponse> = {}): RepositoriesPageResponse {
  return { repositories: [], total: 0, next: null, prev: null, ...overrides };
}

function renderCentre(result: ApiResult<RepositoriesPageResponse>, q = '', now = Date.now()) {
  return render(<RepositoriesCentre result={result} q={q} now={now} />, {
    wrapper: withNuqsTestingAdapter(),
  });
}

describe('RepositoriesCentre', () => {
  it('a FAILED repositories query renders an error line, never a fabricated table', () => {
    renderCentre({ ok: false, reason: 'unavailable' });

    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an honest "no repositories connected yet" message on a real empty result', () => {
    renderCentre({ ok: true, data: basePage() });

    expect(screen.getByText('No repositories connected yet.')).toBeInTheDocument();
  });

  it('renders a "no match" message, distinct from the truly-empty state, when a search yields nothing', () => {
    renderCentre({ ok: true, data: basePage() }, 'nonexistent');

    expect(screen.getByText('No repositories match "nonexistent".')).toBeInTheDocument();
  });

  it('renders real repository rows with their status', () => {
    renderCentre({
      ok: true,
      data: basePage({ repositories: [baseRepo()], total: 1 }),
    });

    expect(screen.getByText('acme/widgets')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('navigates to the repository detail page when a row is selected', async () => {
    const user = userEvent.setup();
    renderCentre({
      ok: true,
      data: basePage({ repositories: [baseRepo({ id: 81 })], total: 1 }),
    });

    await user.click(screen.getByText('acme/widgets'));

    expect(pushMock).toHaveBeenCalledWith('/repositories/81');
  });
});
