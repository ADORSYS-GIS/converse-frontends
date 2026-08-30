import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { PoliciesScreen } from './use-policies-screen';

/**
 * Container-level acceptance coverage for `/settings/policies` — IA v3 phase 2's merge of the
 * deleted `/settings/account` and `/settings/projects` routes (`account-settings-centre.test.tsx`/
 * `project-settings-centre.test.tsx`'s own coverage, folded into this one file the same way the
 * two routes folded into this one screen), PLUS the new project-governance controls
 * (`sections/project-policy-controls`) this phase adds inside the project detail sheet.
 *
 * `usePoliciesScreen` is mocked wholesale, matching every other `*-centre.test.tsx` in this app.
 */
const usePoliciesScreenMock = vi.fn();
vi.mock('./use-policies-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-policies-screen')>();
  return {
    ...actual,
    usePoliciesScreen: () => usePoliciesScreenMock(),
  };
});

/**
 * `+ New project` is a shared, cross-route trigger whose real implementation reads live
 * account/session context this container-level test does not stand up — same mock
 * `project-settings-centre.test.tsx` used to carry.
 */
vi.mock('./use-create-project-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-create-project-dialog')>();
  return {
    ...actual,
    useOpenCreateProjectDialog: () => ({ open: vi.fn(), eligible: true, reason: undefined }),
  };
});

const gatewayProd = {
  id: 'proj_7f21',
  name: 'gateway-prod',
  billingIdentity: 'adorsys-gis/gateway',
  billingPlan: 'pro',
  quotaTier: 'scale',
  modelPolicy: 'allow_all',
  status: 'active',
  isDefault: true,
};

function baseScreen(overrides: Partial<PoliciesScreen> = {}): PoliciesScreen {
  return {
    scopeLabel: 'Widgets Ltd',
    accountSettings: {
      panel: {
        account: { id: 'auth0|9f3a', name: 'Widgets Ltd' },
        loading: false,
        onCreate: vi.fn(),
        onRename: vi.fn(),
        onRetry: vi.fn(),
      },
      details: { id: 'auth0|9f3a', status: 'active', defaultQuotaTier: 'growth' },
    },
    projectSettings: {
      projects: [gatewayProd],
      loading: false,
      search: '',
      onSearchChange: vi.fn(),
      onSelectRow: vi.fn(),
      onRetry: vi.fn(),
    },
    projectDetail: {
      open: false,
      project: null,
      onOpenChange: vi.fn(),
      onRename: vi.fn(),
      renameDisabled: false,
      renameReason: undefined,
    },
    projectNameDialog: {
      open: false,
      projectId: 'proj_7f21',
      currentName: 'gateway-prod',
      name: 'gateway-prod',
      onNameChange: vi.fn(),
      submitting: false,
      canSubmit: false,
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    },
    projectCount: 1,
    onCopyId: vi.fn(),
    policyControls: null,
    ...overrides,
  };
}

async function renderCentre(
  overrides: Partial<PoliciesScreen> = {},
  onUrlUpdate?: (event: UrlUpdateEvent) => void
) {
  usePoliciesScreenMock.mockReturnValue(baseScreen(overrides));
  const { PoliciesCentre } = await import('./policies-centre');
  return render(<PoliciesCentre />, {
    wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }),
  });
}

describe('PoliciesCentre', () => {
  it('renders the account identity rows (name, id, status, default quota tier)', async () => {
    await renderCentre();

    const account = screen.getByRole('region', { name: 'Account settings' });
    expect(within(account).getByText('Widgets Ltd')).toBeInTheDocument();
    expect(within(account).getByText('Status')).toBeInTheDocument();
    expect(within(account).getByText('growth')).toBeInTheDocument();
  });

  it('opens the shared create-account dialog (`?new-account=`) from the PageHeader action', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    await renderCentre({}, onUrlUpdate);

    await user.click(screen.getByRole('button', { name: '+ New account' }));

    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?new-account=true');
  });

  it('renders one summary row per project — name and a status/tier line', async () => {
    await renderCentre();

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('active · scale')).toBeInTheDocument();
  });

  it('opens the project detail sheet with its full field list and a Rename header action', async () => {
    await renderCentre({
      projectDetail: {
        open: true,
        project: gatewayProd,
        onOpenChange: vi.fn(),
        onRename: vi.fn(),
        renameDisabled: false,
        renameReason: undefined,
      },
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('gateway-prod');
    expect(screen.getByText('Billing identity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('renders the new model-policy controls inside the project detail sheet when supplied', async () => {
    await renderCentre({
      projectDetail: {
        open: true,
        project: gatewayProd,
        onOpenChange: vi.fn(),
        onRename: vi.fn(),
        renameDisabled: false,
        renameReason: undefined,
      },
      policyControls: {
        modelPolicy: 'allow_all',
        onModelPolicyChange: vi.fn(),
        allowedModels: [],
        onAllowedModelsChange: vi.fn(),
        catalog: [{ id: 'gpt-4o', name: 'GPT-4o' }],
      },
    });

    await screen.findByRole('dialog');
    expect(screen.getByRole('region', { name: 'Model access policy' })).toBeInTheDocument();
  });

  it('renders no model-policy controls when the screen has none to show (no selection)', async () => {
    await renderCentre({ policyControls: null });

    expect(screen.queryByRole('region', { name: 'Model access policy' })).not.toBeInTheDocument();
  });

  it('carries a real search box — this is a browsable, paginated list', async () => {
    await renderCentre();

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('no longer renders the old Account/Projects tab row — the settings area nav replaced it', async () => {
    await renderCentre();

    expect(screen.queryByRole('link', { name: /^Account$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Projects/ })).not.toBeInTheDocument();
  });

  it('scopes the page subtitle to the account label only — no stale IA-explainer sentence', async () => {
    await renderCentre();

    expect(screen.queryByText(/Filtering and browsing live on Manage/)).not.toBeInTheDocument();
  });
});
