import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AccountDirectory } from './component';
import { accountDirectoryFixture, accountDirectoryPropsFixture } from './fixtures';

const meta: Meta<typeof AccountDirectory> = {
  title: 'Sections/AccountDirectory',
  component: AccountDirectory,
  args: { ...accountDirectoryPropsFixture, onRetry: fn(), onCreate: fn(), onSelectAccount: fn() },
};

export default meta;
type Story = StoryObj<typeof AccountDirectory>;

export const Populated: Story = { name: 'Two accounts, one unnamed' };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Loading: Story = {
  name: 'Loading — claims nothing either way',
  args: { accounts: [], loading: true },
};

/** A failed fetch is "unknown", never "you have no accounts" — the two must not look the same. */
export const Failed: Story = {
  name: 'Failed fetch — unknown, not known-absent',
  args: { accounts: [], error: 'Could not load your accounts.' },
};

/**
 * Signed in, zero accounts — the first-run state (`/`'s own zero-accounts resolver branch shares
 * the identical create flow, ADR 0013 D1). Restyled as an `EmptyState` block with the `Create
 * account` CTA rather than a placard-less blank list.
 */
export const NoAccounts: Story = {
  name: 'No accounts yet — EmptyState block',
  args: { accounts: [] },
};

export const MobileBaseTier: Story = {
  name: 'Mobile base tier (<600)',
  globals: { viewport: { value: 'base390' } },
  args: { accounts: accountDirectoryFixture },
};
