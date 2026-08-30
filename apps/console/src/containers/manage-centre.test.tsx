import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { ManageScreen as ManageScreenData } from './use-manage-screen';

/**
 * Container-level acceptance coverage for what `/manage` mounts — and, since the Settings screen
 * landed, for what it must NOT.
 *
 * `useManageScreen` is mocked wholesale, matching `overview-centre.test.tsx`'s established split:
 * the hook's own pure mapping is covered cheaply elsewhere (`project-rows.test.ts`,
 * `rpc-field-error.test.ts`), while this file answers the different, black-box question — is this
 * affordance on THIS screen at all.
 *
 * The account flow's own coverage moved to `settings-centre.test.tsx` along with the flow. What
 * stays here is the inverse assertion: Manage is a filtering and browsing screen, so a core
 * account mutation appearing on it again is a regression (owner, 2026-08-29 — "We cannot modify
 * account core information on the same page we're filtering").
 */
const useManageScreenMock = vi.fn();
vi.mock('./use-manage-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-manage-screen')>();
  return {
    ...actual,
    useManageScreen: () => useManageScreenMock(),
  };
});

function baseScreen(overrides: Partial<ManageScreenData> = {}): ManageScreenData {
  return {
    scopeLabel: 'adorsys-gis',
    rows: [],
    loading: false,
    errorMessage: undefined,
    spendPendingMessage: 'Spend is not shown here yet.',
    totals: { shownLabel: '0 of 0', spendMtd: null },
    retry: vi.fn(),
    search: '',
    setSearch: vi.fn(),
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
    projectCount: 0,
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

async function renderCentre(overrides: Partial<ManageScreenData> = {}) {
  useManageScreenMock.mockReturnValue(baseScreen(overrides));
  const { ManageCentre } = await import('./manage-centre');
  return render(<ManageCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('ManageCentre', () => {
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
    // one write Manage legitimately owns.
    await renderCentre();

    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New project' })).toBeInTheDocument();
  });
});
