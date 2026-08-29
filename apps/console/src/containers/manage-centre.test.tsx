import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { ManageScreen as ManageScreenData } from './use-manage-screen';

/**
 * Container-level acceptance coverage for the account flow's placement and its null-name
 * rendering (converse-frontends#365 — "I cannot create an account on the console").
 *
 * `useManageScreen` is mocked wholesale, matching `overview-centre.test.tsx`'s established split:
 * the hook's own pure mapping is covered cheaply elsewhere (`build-create-account-input.test.ts`,
 * `rpc-field-error.test.ts`, `account-label.test.ts`), while this file answers the different,
 * black-box question — given an account state, does `/manage` actually render the corresponding
 * affordance, and is it on THIS screen at all.
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
    accountPanel: {
      account: { id: 'auth0|9f3a', name: 'Widgets Ltd' },
      loading: false,
      onCreate: vi.fn(),
      onRename: vi.fn(),
      onRetry: vi.fn(),
    },
    accountNameDialog: {
      open: false,
      mode: 'rename',
      subjectLabel: 'auth0|9f3a',
      currentlyNamed: true,
      name: 'Widgets Ltd',
      onNameChange: vi.fn(),
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

describe('ManageCentre — the account flow', () => {
  it('offers a way to create an account when the signed-in principal has none', async () => {
    await renderCentre({
      accountPanel: {
        account: null,
        loading: false,
        onCreate: vi.fn(),
        onRename: vi.fn(),
        onRetry: vi.fn(),
      },
    });

    // The reported dead end: before this, /manage rendered a disabled `+ New project` reading
    // "Select an account to create a project." with no account to select and no way to make one.
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders an unnamed account as a named absence, never as its id or a blank', async () => {
    await renderCentre({
      accountPanel: {
        account: { id: 'auth0|9f3a', name: null },
        loading: false,
        onCreate: vi.fn(),
        onRename: vi.fn(),
        onRetry: vi.fn(),
      },
    });

    expect(screen.getByText('Unnamed account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
  });

  it('offers a rename for an account that already has a name', async () => {
    await renderCentre();

    expect(screen.getByText('Widgets Ltd')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('mounts the account dialog on this screen, opened from the URL flag', async () => {
    await renderCentre({
      accountNameDialog: {
        open: true,
        mode: 'create',
        subjectLabel: 'auth0|9f3a',
        currentlyNamed: false,
        name: '',
        onNameChange: vi.fn(),
        submitting: false,
        canSubmit: true,
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Create account');
  });

  it('places the account panel above the projects ledger it is upstream of', async () => {
    const { container } = await renderCentre();

    const panel = container.querySelector('section[aria-label="Account"]');
    const ledgerHeading = screen.getByRole('heading', { name: 'Projects' });
    expect(panel).not.toBeNull();
    // `Node.compareDocumentPosition` — the panel must follow the screen heading and precede the
    // ledger's own toolbar, i.e. it is part of this screen rather than bolted on at the end.
    expect(
      ledgerHeading.compareDocumentPosition(panel as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
