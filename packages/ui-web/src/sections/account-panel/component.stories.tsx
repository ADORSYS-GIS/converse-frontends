import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AccountPanel } from './component';

const meta: Meta<typeof AccountPanel> = {
  title: 'Sections/AccountPanel',
  component: AccountPanel,
  args: {
    account: { id: 'auth0|9f3a2c7e41b0', name: 'Widgets Ltd' },
    loading: false,
    onCreate: fn(),
    onRename: fn(),
    onRetry: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AccountPanel>;

export const Named: Story = { name: 'Named account' };

/**
 * The common case in production right now. `Account.name` shipped nullable
 * (lightbridge-authz#551) with no truthful backfill value, so every account created before that
 * migration reads back `null` and stays that way until someone names it.
 */
export const Unnamed: Story = {
  name: 'Unnamed account (name === null) — the production default today',
  args: { account: { id: 'auth0|9f3a2c7e41b0', name: null } },
};

/**
 * Both at once, which is the comparison that matters: the placeholder has to read as an absence
 * next to a real name, not as another value.
 */
export const NamedBesideUnnamed: Story = {
  name: 'Named beside unnamed — the placeholder must not read as a value',
  render: (args) => (
    <div className="flex flex-col gap-6">
      <AccountPanel {...args} account={{ id: 'auth0|9f3a2c7e41b0', name: 'Widgets Ltd' }} />
      <AccountPanel {...args} account={{ id: 'auth0|1b77de04aa93', name: null }} />
    </div>
  ),
};

export const NamedBesideUnnamedLight: Story = {
  name: 'Named beside unnamed — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: (args) => (
    <div className="flex flex-col gap-6">
      <AccountPanel {...args} account={{ id: 'auth0|9f3a2c7e41b0', name: 'Widgets Ltd' }} />
      <AccountPanel {...args} account={{ id: 'auth0|1b77de04aa93', name: null }} />
    </div>
  ),
};

/** The state the production report was about: signed in, no account, nothing else works. */
export const NoAccount: Story = {
  name: 'No account yet — the reported dead end, now with a way out',
  args: { account: null },
};

export const NoAccountBlocked: Story = {
  name: 'No account, creation not possible — the reason is stated',
  args: {
    account: null,
    createDisabled: true,
    createReason: 'Sign in to create an account.',
  },
};

export const Loading: Story = {
  name: 'Loading — claims nothing either way',
  args: { account: null, loading: true },
};

/** A failed fetch is "unknown", never "you have no account" — the two must not look the same. */
export const Failed: Story = {
  name: 'Failed fetch — unknown, not known-absent',
  args: { account: null, error: 'Could not load your account.' },
};
