import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AccountSettings } from './component';
import {
  accountDetailsFixture,
  accountDetailsNoQuotaFixture,
  namedAccountPanelFixture,
  noAccountPanelFixture,
  unnamedAccountPanelFixture,
} from './fixtures';

const meta: Meta<typeof AccountSettings> = {
  title: 'Sections/AccountSettings',
  component: AccountSettings,
  args: {
    panel: namedAccountPanelFixture,
    details: accountDetailsFixture,
    onCopyId: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AccountSettings>;

export const Named: Story = { name: 'Named account, tier assigned' };

export const NamedLight: Story = {
  name: 'Named account — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/**
 * The state most production accounts are in: never named, and no quota tier, because the console's
 * own `createAccount` call sends `defaultQuota: null` (no procedure exposes the tier catalogue for
 * a picker to read). Restyled as an `EmptyState` block with the naming CTA, rather than a row of
 * dashes.
 */
export const UnnamedNoTier: Story = {
  name: 'Unnamed account, no tier assigned — the production default today',
  args: { panel: unnamedAccountPanelFixture, details: accountDetailsNoQuotaFixture },
};

/**
 * Signed in with no account. Restyled as an `EmptyState` block with the `Create account` CTA —
 * there is no account to have a status, and this is the way out.
 */
export const NoAccount: Story = {
  name: 'No account yet — EmptyState block, not dashed rows',
  args: { panel: noAccountPanelFixture, details: null },
};

export const Loading: Story = {
  name: 'Loading — claims nothing either way',
  args: { panel: { ...noAccountPanelFixture, loading: true }, details: null },
};

/** A failed fetch is "unknown", never "you have no account" — the two must not look the same. */
export const Failed: Story = {
  name: 'Failed fetch — unknown, not known-absent',
  args: {
    panel: { ...noAccountPanelFixture, error: 'Could not load your account.' },
    details: null,
  },
};

/** Without an `onCopyId` the row renders plainly rather than carrying a dead button. */
export const NoCopyAffordance: Story = {
  name: 'No clipboard available — the row loses the button, not the id',
  args: { onCopyId: undefined },
};

export const MobileBaseTier: Story = {
  name: 'Mobile base tier (<600)',
  globals: { viewport: { value: 'base390' } },
};
