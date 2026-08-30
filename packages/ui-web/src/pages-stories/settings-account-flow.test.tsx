import React from 'react';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react-vite';
import { describe, expect, it } from 'vitest';

import * as stories from './settings.stories';

/**
 * Runs the SETTINGS page's account and project stories for real, `play` functions included.
 *
 * `build-storybook` compiles stories; it does not execute them, so a `play` function that no
 * longer finds its own controls builds green and only fails in front of a human. `composeStories`
 * mounts the same story the browser would and lets vitest drive it — which is what makes
 * "verifiable in Storybook" a CI property rather than a manual one.
 *
 * Phase 6 (admin/settings revamp): `AccountSettings` no longer wraps the deleted `AccountPanel` —
 * the account id now renders exactly once (inside the settings list, Copy beside it). Phase 9
 * (Addition C) changed the unnamed-account shape again: it is an ordinary `SettingsRow` now
 * ("Not set" + "Name this account"), not a full-card `EmptyState` placard — only "no account at
 * all" stays an `EmptyState`. The assertions below were updated to match; the STORIES themselves
 * (real controls, real dialogs) are unchanged in intent.
 */
const {
  CreateAccountFlow,
  NoAccount,
  NoAccountDialogOpen,
  RenameProjectFlow,
  UnnamedAccount,
  UnnamedAccountDialogOpen,
} = composeStories(stories);

describe('SETTINGS — account flow stories', () => {
  it('drives the create flow through the real controls (the story play function)', async () => {
    const { container } = render(<CreateAccountFlow />);
    // Narrowed rather than `?.`-ed: a story that silently lost its `play` function must fail
    // here, not pass by doing nothing.
    if (!CreateAccountFlow.play) throw new Error('CreateAccountFlow has no play function.');
    await CreateAccountFlow.play({ canvasElement: container });
  }, 30000);

  it('offers a way out of the no-account dead end', () => {
    const { getByRole } = render(<NoAccount />);
    expect(getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('opens the create dialog for a principal with no account', async () => {
    const { findByRole } = render(<NoAccountDialogOpen />);
    expect(await findByRole('dialog')).toHaveAccessibleName('Create account');
  });

  it('renders an unnamed account as a named absence, as an ordinary row — not a full-card placard', () => {
    const { getAllByText, getByText, getByRole } = render(<UnnamedAccount />);

    // The `PageHeader` subtitle falls back to this label for the scope line — the row itself
    // reads "Not set", checked separately below.
    expect(getAllByText('Unnamed account').length).toBeGreaterThan(0);
    expect(getByText('Not set')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
    // The rest of the account's facts stay visible beside it — an account is still an account
    // before it has a name.
    expect(getByText('Account id')).toBeInTheDocument();
    expect(getByText('Status')).toBeInTheDocument();
  });

  it('says "Name this account" rather than "Rename" for one that never had a name', async () => {
    const { findByRole } = render(<UnnamedAccountDialogOpen />);
    expect(await findByRole('dialog')).toHaveAccessibleName('Name this account');
  });
});

describe('SETTINGS — project rename stories', () => {
  it('drives the rename flow from the row that was pressed', async () => {
    const { container } = render(<RenameProjectFlow />);
    if (!RenameProjectFlow.play) throw new Error('RenameProjectFlow has no play function.');
    await RenameProjectFlow.play({ canvasElement: container });
  }, 30000);
});
