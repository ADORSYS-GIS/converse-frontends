import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectsScreen as ProjectsScreenData } from './use-projects-screen';

/**
 * Container-level acceptance coverage for what `/projects` (renamed from `/manage`, 2026-08-30
 * revamp brief) mounts — and, since the Settings screen landed, for what it must NOT.
 *
 * `useProjectsScreen` is mocked wholesale, matching `overview-centre.test.tsx`'s established
 * split: the hook's own pure mapping is covered cheaply elsewhere (`project-rows.test.ts`,
 * `rpc-field-error.test.ts`), while this file answers the different, black-box question — is this
 * affordance on THIS screen at all.
 *
 * The account flow's own coverage moved to `account-settings-centre.test.tsx` along with the
 * flow (phase 6, admin/settings revamp: `/settings/account`, a real route now). What stays here
 * is the inverse assertion: Projects is a filtering and browsing screen, so a core account
 * mutation appearing on it again is a regression (owner, 2026-08-29 — "We cannot modify account
 * core information on the same page we're filtering").
 */
const useProjectsScreenMock = vi.fn();
vi.mock('./use-projects-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-projects-screen')>();
  return {
    ...actual,
    useProjectsScreen: () => useProjectsScreenMock(),
  };
});

function baseScreen(overrides: Partial<ProjectsScreenData> = {}): ProjectsScreenData {
  return {
    scopeLabel: 'adorsys-gis',
    rows: [],
    loading: false,
    errorMessage: undefined,
    retry: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    filtersActive: false,
    newProject: vi.fn(),
    createProjectEligible: true,
    createProjectReason: undefined,
    createProjectDialog: {
      open: false,
      accountLabel: 'auth0|9f3a',
      name: '',
      onNameChange: vi.fn(),
      billingIdentity: '',
      onBillingIdentityChange: vi.fn(),
      plans: [],
      plansLoading: false,
      onRetryPlans: vi.fn(),
      planId: null,
      onPlanChange: vi.fn(),
      submitting: false,
      canSubmit: false,
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    },
    selectedProject: null,
    selectRow: vi.fn(),
    clearSelection: vi.fn(),
    projectCount: 0,
    sort: { key: 'name', direction: 'asc' },
    onSortChange: vi.fn(),
    pagination: {
      shown: 0,
      total: 0,
      hasPrev: false,
      hasNext: false,
      onPrev: vi.fn(),
      onNext: vi.fn(),
    },
    filters: {
      accountValue: 'auth0|9f3a',
      accountOptions: [],
      onAccountChange: vi.fn(),
      statusOptions: [],
      statusValue: 'all',
      onStatusChange: vi.fn(),
      budgetStateValue: 'all',
      budgetStateOptions: [],
      onBudgetStateChange: vi.fn(),
    },
    report: {
      open: false,
      onOpenChange: vi.fn(),
      period: '2026-08',
      onPeriodChange: vi.fn(),
      scopeSlot: null,
      groupByOptions: [],
      groupBy: 'project',
      onGroupByChange: vi.fn(),
      includeToggles: [],
      onToggleInclude: vi.fn(),
      format: 'csv',
      onFormatChange: vi.fn(),
      onGenerate: vi.fn(),
      generating: false,
    },
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<ProjectsScreenData> = {}) {
  useProjectsScreenMock.mockReturnValue(baseScreen(overrides));
  const { ProjectsCentre } = await import('./projects-centre');
  return render(<ProjectsCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('ProjectsCentre', () => {
  it('does not mount the account panel any more — it moved to /settings', async () => {
    const { container } = await renderCentre();

    expect(container.querySelector('section[aria-label="Account"]')).toBeNull();
    expect(container.querySelector('section[aria-label="Account settings"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Name this account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('still owns the project ledger and its own create-project write', async () => {
    // `+ New project` stays: creating a project IS what this ledger is a list of, and it is the
    // one write Projects legitimately owns.
    await renderCentre({ rows: [], filtersActive: false });

    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    // Two `+ New project` buttons render while the ledger is a true empty collection: the header
    // action and the `EmptyState` CTA, both gated identically — see `projects-centre.tsx`.
    expect(screen.getAllByRole('button', { name: '+ New project' }).length).toBeGreaterThan(0);
  });

  it('renders no permanent "spend is unwired" banner — Spend MTD is a real column now', async () => {
    await renderCentre();

    expect(
      screen.queryByText(/not shown here yet|does not query the usage backend/)
    ).not.toBeInTheDocument();
  });

  it('renders EmptyState with a gated CTA for a true empty collection (no active filter)', async () => {
    await renderCentre({
      rows: [],
      filtersActive: false,
      createProjectEligible: false,
      createProjectReason: 'Select an account to create a project.',
    });

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    const ctas = screen.getAllByRole('button', { name: '+ New project' });
    for (const cta of ctas) {
      expect(cta).toBeDisabled();
      expect(cta).toHaveAttribute('title', 'Select an account to create a project.');
    }
  });

  it('renders an inline "no matches" line, not EmptyState, when a filter empties the list', async () => {
    await renderCentre({ rows: [], filtersActive: true });

    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
    expect(screen.getByText('No projects match these filters.')).toBeInTheDocument();
    // Structure stays — the column headers are still on screen.
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });
});
