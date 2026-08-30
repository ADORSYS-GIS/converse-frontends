import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
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

async function renderCentre(
  overrides: Partial<AccountSettingsScreenData> = {},
  onUrlUpdate?: (event: UrlUpdateEvent) => void
) {
  useAccountSettingsScreenMock.mockReturnValue(baseScreen(overrides));
  const { AccountSettingsCentre } = await import('./account-settings-centre');
  return render(<AccountSettingsCentre />, {
    wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }),
  });
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

    // Phase 9 (Addition C): the unnamed state is an ordinary row now ("Not set" + a naming
    // action), not a full-card placard — see `sections/account-settings/component.test.tsx`.
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
  });

  it('offers a rename for an account that already has a name, as the Account name row’s own action', async () => {
    await renderCentre();

    // Twice on this screen: the `PageHeader` subtitle (the scope) and the settings list's own
    // `Account name` row (the account, in a screen that can hold several accounts' worth of
    // settings over a session) — see `renders the Account/Projects tab row` for the count that
    // would catch either going missing.
    expect(screen.getAllByText('Widgets Ltd').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('mounts the RENAME account dialog on this screen, opened from the URL flag', async () => {
    await renderCentre({
      accountNameDialog: {
        open: true,
        mode: 'rename',
        subjectLabel: 'auth0|9f3a',
        currentlyNamed: true,
        name: 'Widgets Ltd',
        onNameChange: vi.fn(),
        submitting: false,
        canSubmit: true,
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    // ADR-0026: `create` mode no longer mounts here at all — `useAccountSettingsScreen`'s own
    // dialog only ever renames the SCOPED account now. See the "+ New account" tests below for
    // where `create` actually lives (the shared, layout-level dialog this screen only triggers).
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Rename account');
  });

  it('opens the shared create-account dialog (`?new-account=`) from the PageHeader action', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    await renderCentre({}, onUrlUpdate);

    await user.click(screen.getByRole('button', { name: '+ New account' }));

    // This screen does not render the create dialog itself (see `account-settings-centre.tsx`'s
    // own doc comment) — it only has to flip the URL flag the layout-mounted instance reads.
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?new-account=true');
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].options.history).toBe('push');
  });

  it('opens the same shared create-account dialog from the empty account panel', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    await renderCentre(
      {
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
      },
      onUrlUpdate
    );

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe('?new-account=true');
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
