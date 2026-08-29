import { render, screen, within } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { SettingsScreen as SettingsScreenData } from './use-settings-screen';

/**
 * Container-level acceptance coverage for `/settings` — the screen the account flow moved to
 * (owner, 2026-08-29: "We need a settings page, with account x project settings and stuffs. We
 * cannot modify account core information on the same page we're filtering").
 *
 * `useSettingsScreen` is mocked wholesale, matching the split `overview-centre.test.tsx` and
 * `manage-centre.test.tsx` already use: the hook's own pure mapping is covered cheaply elsewhere
 * (`project-settings-rows.test.ts`, `rpc-field-error.test.ts`, `build-create-account-input.test.ts`),
 * while this file answers the black-box question — given a state, does `/settings` render the
 * corresponding affordance, and is it on THIS screen.
 */
const useSettingsScreenMock = vi.fn();
vi.mock('./use-settings-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-settings-screen')>();
  return {
    ...actual,
    useSettingsScreen: () => useSettingsScreenMock(),
  };
});

function baseScreen(overrides: Partial<SettingsScreenData> = {}): SettingsScreenData {
  return {
    accountSettings: {
      panel: {
        account: { id: 'auth0|9f3a', name: 'Widgets Ltd' },
        loading: false,
        onCreate: vi.fn(),
        onRename: vi.fn(),
        onRetry: vi.fn(),
      },
      details: { id: 'auth0|9f3a', status: 'active', defaultQuotaTier: 'growth' },
      onCopyId: vi.fn(),
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
    projectSettings: {
      projects: [
        {
          id: 'proj_7f21',
          name: 'gateway-prod',
          billingIdentity: 'adorsys-gis/gateway',
          billingPlan: 'pro',
          quotaTier: 'scale',
          modelPolicy: 'allow_all',
          status: 'active',
          isDefault: true,
        },
      ],
      loading: false,
      onRename: vi.fn(),
      onRetry: vi.fn(),
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
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<SettingsScreenData> = {}) {
  useSettingsScreenMock.mockReturnValue(baseScreen(overrides));
  const { SettingsCentre } = await import('./settings-centre');
  return render(<SettingsCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('SettingsCentre — the account flow', () => {
  it('offers a way to create an account when the signed-in principal has none', async () => {
    await renderCentre({
      accountSettings: {
        panel: {
          account: null,
          loading: false,
          onCreate: vi.fn(),
          onRename: vi.fn(),
          onRetry: vi.fn(),
        },
        details: null,
      },
    });

    // The reported dead end (converse-frontends#365), now answered on the screen that owns
    // account identity rather than beside a ledger's filters.
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders an unnamed account as a named absence, never as its id or a blank', async () => {
    await renderCentre({
      accountSettings: {
        panel: {
          account: { id: 'auth0|9f3a', name: null },
          loading: false,
          onCreate: vi.fn(),
          onRename: vi.fn(),
          onRetry: vi.fn(),
        },
        details: { id: 'auth0|9f3a', status: 'active', defaultQuotaTier: null },
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

  it('shows the account id, status and quota tier as read-only rows', async () => {
    await renderCentre();

    const account = screen.getByRole('region', { name: 'Account settings' });

    expect(within(account).getByText('Account id')).toBeInTheDocument();
    expect(within(account).getByRole('button', { name: 'Copy account id' })).toBeInTheDocument();
    // Scoped to the Account section: every project block carries its own `Status` row, so an
    // unscoped query here would match the project's as well and pass for the wrong reason.
    expect(within(account).getByText('Status')).toBeInTheDocument();
    expect(within(account).getByText('Default quota tier')).toBeInTheDocument();
    expect(within(account).getByText('growth')).toBeInTheDocument();
  });
});

describe('SettingsCentre — projects', () => {
  it('places the account block above the projects it is upstream of', async () => {
    const { container } = await renderCentre();

    const account = container.querySelector('section[aria-label="Account settings"]');
    const projects = container.querySelector('section[aria-label="Projects"]');
    expect(account).not.toBeNull();
    expect(projects).not.toBeNull();
    // `Node.compareDocumentPosition` — with no account there are no projects to configure, so the
    // block that can create one comes first.
    expect(
      (account as Node).compareDocumentPosition(projects as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders each project’s own settings, and mounts the rename dialog per row', async () => {
    await renderCentre();

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis/gateway')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename gateway-prod' })).toBeInTheDocument();
  });

  it('opens the rename dialog on the row the URL names', async () => {
    await renderCentre({
      projectNameDialog: {
        open: true,
        projectId: 'proj_7f21',
        currentName: 'gateway-prod',
        name: 'gateway-prod',
        onNameChange: vi.fn(),
        submitting: false,
        canSubmit: false,
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Rename project');
    expect(dialog).toHaveTextContent('proj_7f21');
  });

  it('carries no filters — this is not a browsing screen', async () => {
    await renderCentre();

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open filters' })).not.toBeInTheDocument();
  });
});
