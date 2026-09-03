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

  // ── The `PageControls` contract (ADR 0015 amendment A2, converse-frontends#504) ──────────────
  //
  // Asserted structurally rather than by "the search box exists": it existed before too, inside
  // the very card it filters. What changed — and what a future edit could silently undo — is WHERE
  // it is, so the assertions name the row it must be in and the card it must not be in.

  it('puts the search box on the floor, in the controls row, never inside the ledger card', () => {
    renderCentre({ ok: true, data: basePage({ repositories: [baseRepo()], total: 1 }) });

    const search = screen.getByRole('searchbox', { name: 'Search repositories' });
    expect(search.closest('.page-controls')).not.toBeNull();
    expect(search.closest('.console-card')).toBeNull();

    // …and in the group whose accessible name is the only thing a screen-reader reader gets in
    // place of the hairline a sighted reader sees.
    expect(screen.getByRole('group', { name: 'Slice' })).toContainElement(search);
  });

  it('keeps the search box when the query FAILS — the controls that would narrow it outlive the table', () => {
    renderCentre({ ok: false, reason: 'unavailable' });

    expect(screen.getByRole('searchbox', { name: 'Search repositories' })).toBeInTheDocument();
    expect(screen.getByText('The control plane is unreachable right now.')).toBeInTheDocument();
  });

  it('offers Reset filters only while a search is actually narrowing the ledger', () => {
    const { unmount } = renderCentre({ ok: true, data: basePage() });
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
    unmount();

    renderCentre({ ok: true, data: basePage() }, 'kubernetes');
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });
});
