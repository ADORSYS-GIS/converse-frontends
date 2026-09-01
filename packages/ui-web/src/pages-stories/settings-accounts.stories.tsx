// Page-level acceptance story for `/settings/accounts` (the identity's account family, plus
// creation) and `/settings/accounts/<id>` (rename, honest budget/tier facts, Members) — sections
// composed inside `ConsoleShell` with the section fixtures.
//
// IA v3 phase E ("the settings/accounts move", converse-frontends#368) — owner directive: "add
// /settings/accounts... And /settings/accounts/<account-id> would be for account related settings
// like e.g members." Both screens are simulated here with one component (`screen: 'list' |
// 'detail'`), the same way `apps/console`'s `AccountsCentre`/`AccountDetailCentre` are two
// containers sharing one `AccountDetailSubNav`. The account CREATE/RENAME flow stories that used
// to live in `settings.stories.tsx` (back when `/settings/policies` still hosted `AccountSettings`)
// moved here along with the section itself — owner: "there's no sense in having account or
// project creation" on the policies page.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AccountNameDialog } from '../components/account-name-dialog';
import { shortAccountId } from '../components/account-badge';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { ErrorLine } from '../components/error-line';
import { InlineStatus } from '../components/inline-status';
import { SkeletonMetric } from '../components/skeleton-metric';
import { SubNav } from '../components/sub-nav';
import type { SubNavItem } from '../components/sub-nav';
import { AccountDirectory } from '../sections/account-directory';
import { accountDirectoryFixture } from '../sections/account-directory/fixtures';
import type { AccountDirectoryRow } from '../sections/account-directory';
import { AccountSettings } from '../sections/account-settings';
import type { AccountSettingsAccount, AccountSettingsDetails } from '../sections/account-settings';
import {
  accountDetailsFixture,
  accountDetailsNoQuotaFixture,
  namedAccountPanelFixture,
} from '../sections/account-settings/fixtures';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

const ACCOUNT_ID = 'auth0|9f3a2c7e41b0';

const MEMBERS_REASON =
  'Accounts have no membership concept today — only projects do (lightbridge-authz#594).';

function accountDetailTabs(active: 'overview' | 'projects' | 'request-refill'): SubNavItem[] {
  return [
    { key: 'overview', label: 'Overview', href: `/settings/accounts/${ACCOUNT_ID}`, active: active === 'overview' },
    {
      key: 'projects',
      label: 'Projects',
      href: `/settings/accounts/${ACCOUNT_ID}/projects`,
      active: active === 'projects',
    },
    {
      key: 'request-refill',
      label: 'Request refill',
      href: `/settings/accounts/${ACCOUNT_ID}/request-refill`,
      active: active === 'request-refill',
    },
  ];
}

type BudgetFacts =
  | { status: 'ready'; ceilingLabel: string }
  | { status: 'loading' }
  | { status: 'error'; caption: string }
  | { status: 'unavailable'; caption: string };

interface SettingsAccountsScreenProps {
  /** Which real route this story simulates — `/settings/accounts` or `/settings/accounts/<id>`. */
  screen?: 'list' | 'detail';
  accounts?: AccountDirectoryRow[];
  loading?: boolean;
  error?: string;
  showAdmin?: boolean;
  /** `null` = signed in with no account at all. An account whose own `name` is `null` is the
   *  separate, and far more common, unnamed state. */
  account?: AccountSettingsAccount | null;
  details?: AccountSettingsDetails | null;
  budget?: BudgetFacts;
  /** Opens `AccountNameDialog` on mount, the way `?new-account=true`/`?account-name=true` does
   *  for real. */
  initialAccountDialogOpen?: boolean;
}

// The composition `apps/console`'s `(console)` layout + `/settings/accounts`|
// `/settings/accounts/<id>` routes perform for real.
function SettingsAccountsScreen({
  screen = 'list',
  accounts = accountDirectoryFixture,
  loading = false,
  error,
  showAdmin = false,
  account = namedAccountPanelFixture.account,
  details = accountDetailsFixture,
  budget = { status: 'ready', ceilingLabel: '$500.00' },
  initialAccountDialogOpen = false,
}: SettingsAccountsScreenProps) {
  // Storybook demo state only — `apps/console`'s real dialog draft lives in each hook's own
  // sanctioned local state.
  const [accountDialogOpen, setAccountDialogOpen] = useState(initialAccountDialogOpen);
  const [accountName, setAccountName] = useState(account?.name ?? '');

  return (
    <ConsoleShell sidebar={storySidebar('settings', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        {screen === 'list' ? (
          <>
            <PageHeader
              title="Accounts"
              subtitle={accounts.length > 0 ? `${accounts.length} accounts` : undefined}
              action={
                <Button type="button" variant="primary" onClick={() => setAccountDialogOpen(true)}>
                  + New account
                </Button>
              }
            />

            <Card>
              <AccountDirectory
                accounts={accounts}
                loading={loading}
                error={error}
                onRetry={() => {}}
                onCreate={() => setAccountDialogOpen(true)}
                onSelectAccount={() => {}}
              />
            </Card>
          </>
        ) : (
          <>
            {/* Mirrors `accountScopeLabel` (`apps/console`'s `account-label.ts`): a real name, or
                `acct_<first8>` for an unnamed account — never "Unnamed account" as a rendered
                label (console-ui skill: "never a raw account UUID as a visible label"). */}
            <PageHeader
              title={account ? (account.name ?? shortAccountId(account.id)) : 'Account'}
              subtitle={account?.id}
            />

            <SubNav orientation="horizontal" items={accountDetailTabs('overview')} />

            <AccountSettings
              panel={{
                account,
                loading: false,
                onCreate: () => setAccountDialogOpen(true),
                onRename: () => setAccountDialogOpen(true),
                onRetry: () => {},
              }}
              details={details}
              onCopyId={() => {}}
            />

            <Card title="Budget">
              <div className="flex flex-col gap-4">
                {budget.status === 'loading' ? (
                  <SkeletonMetric width={140} />
                ) : budget.status === 'error' ? (
                  <ErrorLine message={budget.caption} />
                ) : budget.status === 'unavailable' ? (
                  <InlineStatus>{budget.caption}</InlineStatus>
                ) : (
                  <p className="text-ink font-mono text-[13px]" data-numeral>
                    {budget.ceilingLabel} budget ceiling this period
                  </p>
                )}
                <Button type="button" variant="secondary" size="sm" className="self-start">
                  Request refill…
                </Button>
              </div>
            </Card>

            <Card title="Members">
              <InlineStatus>{MEMBERS_REASON}</InlineStatus>
            </Card>
          </>
        )}

        <AccountNameDialog
          open={accountDialogOpen}
          mode={account === null ? 'create' : 'rename'}
          subjectLabel={account?.id ?? 'auth0|9f3a2c7e41b0'}
          currentlyNamed={(account?.name ?? null) !== null}
          name={accountName}
          onNameChange={setAccountName}
          submitting={false}
          canSubmit={account === null || accountName.trim() !== (account.name ?? '')}
          onSubmit={() => setAccountDialogOpen(false)}
          onCancel={() => setAccountDialogOpen(false)}
        />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof SettingsAccountsScreen> = {
  title: 'Pages/Settings/Accounts',
  component: SettingsAccountsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SettingsAccountsScreen>;

// ── /settings/accounts — the list ────────────────────────────────────────────────────────────

export const List: Story = { name: '/settings/accounts — the account family', render: () => <SettingsAccountsScreen /> };

export const ListLight: Story = {
  name: '/settings/accounts — wireframe (light)',
  render: () => <SettingsAccountsScreen />,
  globals: { theme: 'wireframe' },
};

export const ListLoading: Story = {
  name: '/settings/accounts — loading',
  render: () => <SettingsAccountsScreen accounts={[]} loading />,
};

export const ListError: Story = {
  name: '/settings/accounts — failed fetch',
  render: () => <SettingsAccountsScreen accounts={[]} error="Could not load your accounts." />,
};

/**
 * Signed in, no account. Every other screen is empty in this state — there is nothing to scope by
 * — which is what the reported "I cannot create an account on the console" was about. The exit
 * now lives on the screen that owns account identity, restyled as an `EmptyState` block.
 */
export const ListNoAccounts: Story = {
  name: '/settings/accounts — none yet (the reported dead end)',
  render: () => <SettingsAccountsScreen accounts={[]} />,
};

/** Same zero-accounts state with the create dialog open, which is what a fresh
 *  `?new-account=true` landing produces for a brand-new identity. */
export const ListNoAccountsDialogOpen: Story = {
  name: '/settings/accounts — none yet, create dialog open',
  render: () => (
    <SettingsAccountsScreen accounts={[]} account={null} initialAccountDialogOpen />
  ),
};

/**
 * The whole flow driven through the real controls: press `+ New account`, type a name, submit.
 * Interaction rather than a static arg set, because the thing worth pinning is that the section's
 * primary actually reaches the dialog.
 */
export const CreateAccountFlow: Story = {
  name: '/settings/accounts — create flow, driven',
  render: () => <SettingsAccountsScreen accounts={[]} account={null} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));

    // The dialog portals to `document.body`, outside `canvasElement`.
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Create account');

    await userEvent.type(within(dialog).getByLabelText('Account name'), 'Widgets Ltd');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument()
    );
  },
};

// ── /settings/accounts/<id> — the detail screen ──────────────────────────────────────────────

export const Detail: Story = {
  name: '/settings/accounts/<id> — rename, budget facts, Members',
  render: () => <SettingsAccountsScreen screen="detail" />,
};

export const DetailLight: Story = {
  name: '/settings/accounts/<id> — wireframe (light)',
  render: () => <SettingsAccountsScreen screen="detail" />,
  globals: { theme: 'wireframe' },
};

/**
 * The state most production accounts are in today: `Account.name` shipped nullable with no
 * truthful backfill (lightbridge-authz#551), so an account created before that migration has never
 * been named. Restyled as an `EmptyState` block with the "Name this account" CTA.
 */
export const DetailUnnamedAccount: Story = {
  name: '/settings/accounts/<id> — unnamed (name === null)',
  render: () => (
    <SettingsAccountsScreen
      screen="detail"
      account={{ id: 'auth0|1b77de04aa93', name: null }}
      details={accountDetailsNoQuotaFixture}
    />
  ),
};

/** Opening the naming dialog from an unnamed account: the verb is "Name", not "Rename". */
export const DetailUnnamedAccountDialogOpen: Story = {
  name: '/settings/accounts/<id> — naming an unnamed account',
  render: () => (
    <SettingsAccountsScreen
      screen="detail"
      account={{ id: 'auth0|1b77de04aa93', name: null }}
      details={accountDetailsNoQuotaFixture}
      initialAccountDialogOpen
    />
  ),
};

/** The budget ceiling gap for a scoped, non-home account (Phase 2d, `isHomeAccount`) — the SAME
 *  honest caption `/`'s Budget card and the refill screen already render. */
export const DetailBudgetUnavailable: Story = {
  name: '/settings/accounts/<id> — budget unavailable for a non-home account',
  render: () => (
    <SettingsAccountsScreen
      screen="detail"
      budget={{
        status: 'unavailable',
        caption:
          'Budget balance and refill requests are only available for your home account today — see lightbridge-authz#577.',
      }}
    />
  ),
};

export const DetailBudgetLoading: Story = {
  name: '/settings/accounts/<id> — budget loading',
  render: () => <SettingsAccountsScreen screen="detail" budget={{ status: 'loading' }} />,
};

/** The Members block: disabled-with-reason inline — `Account` carries no membership concept
 *  today (lightbridge-authz#594), not a fabricated roster and not a silently omitted block. */
export const DetailMembersDisabled: Story = {
  name: '/settings/accounts/<id> — Members, disabled with a stated reason',
  render: () => <SettingsAccountsScreen screen="detail" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText(MEMBERS_REASON)).toBeInTheDocument();
  },
};

// `md` tier (600–1024): the persistent left rail returns; there is no right rail to dock.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <SettingsAccountsScreen />,
};

// Base tier (<600): single column, nav docked as a fixed bottom navigation bar.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsAccountsScreen />,
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsAccountsScreen />,
};
