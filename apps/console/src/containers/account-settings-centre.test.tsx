import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import type { AccountSettingsScreen as AccountSettingsScreenData } from './use-account-settings-screen';

/**
 * Container-level acceptance coverage for `/settings/account` — the account-identity half of the
 * screen the account flow moved to (owner, 2026-08-29: "We need a settings page, with account x
 * project settings and stuffs. We cannot modify account core information on the same page we're
 * filtering"), now its own real route (phase 6, admin/settings revamp — Attio pattern).
 *
 * `useAccountSettingsScreen` is mocked wholesale, matching every other `*-centre.test.tsx` in
 * this app. `next/navigation`'s `usePathname` and `next/link` are mocked too: `SettingsSubNav`
 * (rendered by this centre) reads the real router, which this app's vitest/jsdom setup does not
 * provide — see `console-shell-mount.test.ts`'s own note that the chrome using these same hooks
 * is deliberately never render-tested, only source-shape-asserted, for the identical reason.
 */
vi.mock('next/navigation', () => ({ usePathname: () => '/settings/account' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const useAccountSettingsScreenMock = vi.fn();
vi.mock('./use-account-settings-screen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-account-settings-screen')>();
  return {
    ...actual,
    useAccountSettingsScreen: () => useAccountSettingsScreenMock(),
  };
});

function baseScreen(overrides: Partial<AccountSettingsScreenData> = {}): AccountSettingsScreenData {
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
    projectCount: 3,
    ...overrides,
  };
}

async function renderCentre(overrides: Partial<AccountSettingsScreenData> = {}) {
  useAccountSettingsScreenMock.mockReturnValue(baseScreen(overrides));
  const { AccountSettingsCentre } = await import('./account-settings-centre');
  return render(<AccountSettingsCentre />, { wrapper: withNuqsTestingAdapter() });
}

describe('AccountSettingsCentre', () => {
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
    // account identity.
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

  it('offers a rename for an account that already has a name, in the Card header', async () => {
    await renderCentre();

    // Twice on this screen: the `PageHeader` subtitle (the scope) and the definition grid's own
    // `Name` row (the account, in a screen that can hold several accounts' worth of settings
    // over a session) — see `renders the Account/Projects tab row` for the count that would
    // catch either going missing.
    expect(screen.getAllByText('Widgets Ltd').length).toBeGreaterThan(0);
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
    expect(within(account).getByText('Status')).toBeInTheDocument();
    expect(within(account).getByText('Default quota tier')).toBeInTheDocument();
    expect(within(account).getByText('growth')).toBeInTheDocument();
  });

  it('renders the Account/Projects tab row, Account active, Projects carrying the project count', async () => {
    await renderCentre({ projectCount: 5 });

    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
    const projectsTab = screen.getByRole('link', { name: 'Projects 5' });
    expect(projectsTab).toHaveAttribute('href', '/settings/projects');
    expect(projectsTab).not.toHaveAttribute('aria-current');
  });

  it('scopes the page subtitle to the account label only — no stale IA-explainer sentence', async () => {
    await renderCentre();

    expect(screen.queryByText(/Filtering and browsing live on Manage/)).not.toBeInTheDocument();
  });
});
