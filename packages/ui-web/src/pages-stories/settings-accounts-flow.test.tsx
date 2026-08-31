import React from 'react';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react-vite';
import { describe, expect, it } from 'vitest';

import * as stories from './settings-accounts.stories';

/**
 * Runs `/settings/accounts` and `/settings/accounts/<id>`'s own account create/rename `play`
 * functions for real (`build-storybook` compiles stories; it does not execute them — see
 * `settings-policies-flow.test.tsx`'s own doc comment for the full "why `composeStories`" case).
 *
 * IA v3 phase E ("the settings/accounts move") moved this coverage here from
 * `settings-account-flow.test.tsx` (renamed `settings-policies-flow.test.tsx`, now project-rename
 * only) along with the `AccountSettings` section itself — owner: "there's no sense in having
 * account or project creation" on `/settings/policies` any more.
 */
const {
  CreateAccountFlow,
  ListNoAccounts,
  ListNoAccountsDialogOpen,
  DetailUnnamedAccount,
  DetailUnnamedAccountDialogOpen,
  DetailMembersDisabled,
} = composeStories(stories);

describe('SETTINGS/ACCOUNTS — list stories', () => {
  it('offers a way out of the no-accounts dead end', () => {
    const { getByRole } = render(<ListNoAccounts />);
    expect(getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('opens the create dialog for a principal with no account', async () => {
    const { findByRole } = render(<ListNoAccountsDialogOpen />);
    expect(await findByRole('dialog')).toHaveAccessibleName('Create account');
  });

  it('drives the create flow through the real controls (the story play function)', async () => {
    const { container } = render(<CreateAccountFlow />);
    if (!CreateAccountFlow.play) throw new Error('CreateAccountFlow has no play function.');
    await CreateAccountFlow.play({ canvasElement: container });
  }, 30000);
});

describe('SETTINGS/ACCOUNTS — detail stories', () => {
  it('renders an unnamed account as a named absence, as an ordinary row — not a full-card placard', () => {
    const { getByText, getByRole } = render(<DetailUnnamedAccount />);

    // The `PageHeader` title falls back to the short id (`acct_<first8>`, mirroring
    // `accountScopeLabel`) — never a fabricated "Unnamed account" label rendered as if it were
    // the account's own name.
    expect(getByRole('heading', { name: /^acct_/ })).toBeInTheDocument();
    // The row itself reads "Not set", with the naming CTA in its own trailing edge.
    expect(getByText('Not set')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
    // The rest of the account's facts stay visible beside it — an account is still an account
    // before it has a name.
    expect(getByText('Account id')).toBeInTheDocument();
    expect(getByText('Status')).toBeInTheDocument();
  });

  it('says "Name this account" rather than "Rename" for one that never had a name', async () => {
    const { findByRole } = render(<DetailUnnamedAccountDialogOpen />);
    expect(await findByRole('dialog')).toHaveAccessibleName('Name this account');
  });

  it('renders the Members block disabled with a stated reason, never a fabricated roster', async () => {
    const { container } = render(<DetailMembersDisabled />);
    if (!DetailMembersDisabled.play) throw new Error('DetailMembersDisabled has no play function.');
    await DetailMembersDisabled.play({ canvasElement: container });
  });
});
