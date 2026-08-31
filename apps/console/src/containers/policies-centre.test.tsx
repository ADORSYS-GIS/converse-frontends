import React from 'react';
import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { PoliciesScreen } from './use-policies-screen';

/**
 * Container-level acceptance coverage for `/settings/policies` — "Project policies" (IA v3 phase
 * 2's merge of the deleted `/settings/account` and `/settings/projects` routes, narrowed by IA v3
 * phase E: owner — "there's no sense in having account or project creation" on this page).
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
    policyControls: null,
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<PoliciesScreen> = {}) {
  usePoliciesScreenMock.mockReturnValue(baseScreen(overrides));
  const { PoliciesCentre } = await import('./policies-centre');
  return render(<PoliciesCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('PoliciesCentre', () => {
  it('no longer renders the account settings block — it moved to /settings/accounts/<id>', async () => {
    await renderCentre();

    expect(screen.queryByRole('region', { name: 'Account settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Name this account' })).not.toBeInTheDocument();
  });

  it('no longer renders account or project creation — both moved off this page', async () => {
    await renderCentre();

    expect(screen.queryByRole('button', { name: '+ New account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ New project' })).not.toBeInTheDocument();
  });

  it('titles the page "Project policies", not the old "Account / Project policies"', async () => {
    await renderCentre();

    expect(screen.getByRole('heading', { name: 'Project policies' })).toBeInTheDocument();
    expect(screen.queryByText('Account / Project policies')).not.toBeInTheDocument();
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

  it('renders the model-policy controls inside the project detail sheet when supplied', async () => {
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
});
