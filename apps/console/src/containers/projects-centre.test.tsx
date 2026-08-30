import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectsScreen as ProjectsScreenData } from './use-projects-screen';
import type { CreateProjectDialogController } from './use-create-project-dialog';

/**
 * Container-level acceptance coverage for what `/projects` (renamed from `/manage`, 2026-08-30
 * revamp brief) mounts — and, since the Settings screen landed, for what it must NOT.
 *
 * `useProjectsScreen` is mocked wholesale, matching `overview-centre.test.tsx`'s established
 * split: the hook's own pure mapping is covered cheaply elsewhere (`project-rows.test.ts`,
 * `rpc-field-error.test.ts`), while this file answers the different, black-box question — is this
 * affordance on THIS screen at all.
 *
 * The account flow's own coverage moved to `policies-centre.test.tsx` along with the flow (phase
 * 6, admin/settings revamp: `/settings/account`, a real route then; IA v3 phase 2 folded it into
 * `/settings/policies`). What stays here
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

/**
 * `CreateProjectDialog` itself is a SHARED, cross-route dialog now (Addition C.1/C.4, 2026-08-30
 * — `use-create-project-dialog.ts`, mounted once in `app/(console)/layout.tsx`); `ProjectsCentre`
 * only calls its lightweight trigger (`useOpenCreateProjectDialog`), not the full controller. That
 * trigger's real implementation reads live account/session context this container-level test does
 * not stand up (the same reason `useProjectsScreen` above is mocked wholesale), so it is mocked
 * the identical way.
 */
const useOpenCreateProjectDialogMock = vi.fn();
vi.mock('./use-create-project-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-create-project-dialog')>();
  return {
    ...actual,
    useOpenCreateProjectDialog: () => useOpenCreateProjectDialogMock(),
  };
});

function baseCreateProject(
  overrides: Partial<Omit<CreateProjectDialogController, 'dialog'>> = {}
): Omit<CreateProjectDialogController, 'dialog'> {
  return {
    open: vi.fn(),
    eligible: true,
    reason: undefined,
    ...overrides,
  };
}

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

async function renderCentre(
  overrides: Partial<ProjectsScreenData> = {},
  createProjectOverrides: Partial<Omit<CreateProjectDialogController, 'dialog'>> = {}
) {
  useProjectsScreenMock.mockReturnValue(baseScreen(overrides));
  useOpenCreateProjectDialogMock.mockReturnValue(baseCreateProject(createProjectOverrides));
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
    await renderCentre(
      { rows: [], filtersActive: false },
      { eligible: false, reason: 'Select an account to create a project.' }
    );

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

  /**
   * Live findings #1 (2026-08-30) — the false-empty flash: `screen.loading` (now
   * `list.query.isLoading || scope.loading`, see `use-projects-screen.ts`) staying `true` while
   * the account scope itself is still resolving must keep the ledger on skeleton rows, never
   * `EmptyState`, even though `rows` is `[]` in exactly the same shape a genuinely empty account
   * renders. This is the regression this suite did not previously catch: the old `loading:
   * list.query.isLoading` computation could go `false` before scope resolved, showing "No
   * projects yet" for a real account that, moments later, turned out to have projects.
   */
  it('renders skeleton rows, never EmptyState, while still loading with zero rows so far', async () => {
    await renderCentre({ rows: [], loading: true, filtersActive: false });

    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
    // Column structure renders immediately — only the body is a skeleton (console-ui skill
    // "Loading": skeleton blocks matching final geometry, headers stay).
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('renders EmptyState only once the ledger has genuinely settled with zero rows', async () => {
    await renderCentre({ rows: [], loading: false, filtersActive: false });

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });
});
