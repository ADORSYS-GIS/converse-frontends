import React from 'react';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react-vite';
import { describe, expect, it } from 'vitest';

import * as stories from './manage.stories';

/**
 * Runs the MANAGE page's account-flow stories for real, `play` functions included.
 *
 * `build-storybook` compiles stories; it does not execute them, so a `play` function that no
 * longer finds its own controls builds green and only fails in front of a human. `composeStories`
 * mounts the same story the browser would and lets vitest drive it — which is what makes
 * "verifiable in Storybook" a CI property rather than a manual one for the flow this PR adds.
 *
 * Scoped deliberately to the account stories rather than to every story in the package: the point
 * is coverage of the new flow, not a blanket story runner nobody asked for.
 */
const {
  CreateAccountFlow,
  NoAccount,
  NoAccountDialogOpen,
  UnnamedAccount,
  UnnamedAccountDialogOpen,
} = composeStories(stories);

describe('MANAGE — account flow stories', () => {
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

  it('renders an unnamed account as a named absence, not as its id', () => {
    const { getByText, queryByText } = render(<UnnamedAccount />);

    expect(getByText('Unnamed account')).toBeInTheDocument();
    expect(queryByText('auth0|1b77de04aa93')).toBeInTheDocument();
    expect(getByText('Unnamed account')).toHaveAttribute('data-named', 'false');
  });

  it('says "Name this account" rather than "Rename" for one that never had a name', async () => {
    const { findByRole } = render(<UnnamedAccountDialogOpen />);
    expect(await findByRole('dialog')).toHaveAccessibleName('Name this account');
  });
});
