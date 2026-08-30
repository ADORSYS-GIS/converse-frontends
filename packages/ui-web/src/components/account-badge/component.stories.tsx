import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AccountBadge } from './component';

const ACCOUNT_ID = '49534505-4c60-4550-83dd-7af22152cec6';

const meta: Meta<typeof AccountBadge> = {
  title: 'Components/AccountBadge',
  component: AccountBadge,
  parameters: { layout: 'padded' },
  args: { accountId: ACCOUNT_ID, name: 'adorsys-gis', onCopyId: () => {} },
  decorators: [
    (Story) => (
      <div className="bg-chrome p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AccountBadge>;

/** The good case: a real name, with the short id beside it as the disambiguator. */
export const Named: Story = {};

export const NamedLight: Story = {
  name: 'Named — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/**
 * What production actually shows today: the account has no name, so the badge degrades to a
 * readable token. This is the case that replaced `49534505-4c60-4550-83dd-7af22152cec6` rendered
 * four times across one screen.
 */
export const Unnamed: Story = {
  args: { name: undefined },
};

export const UnnamedLight: Story = {
  name: 'Unnamed — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { name: undefined },
};

/** No copy handler — inert text, with the full id still reachable via the `title` tooltip. */
export const ReadOnly: Story = {
  args: { onCopyId: undefined },
};

/** No account resolved yet (pre-session, or a failed scope query). */
export const Empty: Story = {
  args: { name: undefined, accountId: '' },
};

/** A name long enough to test that the header does not blow open. */
export const LongName: Story = {
  args: { name: 'adorsys-gis-platform-engineering-shared' },
};

/**
 * Two or more reachable accounts — the badge becomes the account switcher that replaced the
 * deleted rail `Account` dropdown. Base UI `Menu`, so keyboard and focus behaviour come from the
 * primitive rather than from hand-written roving tabindex.
 */
export const Switcher: Story = {
  args: {
    accounts: [
      { id: ACCOUNT_ID, label: 'adorsys-gis' },
      { id: 'b71f0a92-3e2c-4d18-9f77-1c0e5b6a4d31', label: 'adorsys-labs' },
      { id: 'c93d2f10-88aa-4c02-b5e6-9a71d3f08e42' },
    ],
    onSelectAccount: () => {},
  },
};

export const SwitcherLight: Story = {
  name: 'Switcher — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Switcher.args,
};

/** Exactly one reachable account — NOT a switcher. A dropdown onto a single option is chrome
 *  imitating a control, so the badge stays text. */
export const SingleAccount: Story = {
  args: { accounts: [{ id: ACCOUNT_ID, label: 'adorsys-gis' }], onSelectAccount: () => {} },
};

/**
 * The shell brief's own workspace switcher — `ConsoleSidebar`'s full-width row, `variant="sidebar"`.
 * Same switcher behaviour as `Switcher` above, relocated.
 */
export const SidebarVariant: Story = {
  args: { ...Switcher.args, variant: 'sidebar', initials: 'AG' },
  decorators: [
    (Story) => (
      <div className="bg-chrome w-60 p-2">
        <Story />
      </div>
    ),
  ],
};

export const SidebarVariantLight: Story = {
  name: 'Sidebar variant — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: SidebarVariant.args,
  decorators: SidebarVariant.decorators,
};

/** The switcher's menu, actually open — a `play` function rather than a screenshot claim, so a
 *  regression that silently stops the menu from opening (Addition 6: this is exactly what
 *  shipped broken for the single-account case below) fails the story's own test, not just a
 *  human's eyeball pass. */
export const SidebarVariantOpen: Story = {
  name: 'Sidebar variant — open',
  args: SidebarVariant.args,
  decorators: SidebarVariant.decorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Switch account/ }));
  },
};

/**
 * Addition 6 (owner review) — the case that shipped broken: this backend seats exactly ONE
 * account per identity for almost every real sign-in, so the sidebar switcher must still read
 * and behave as a real dropdown (account list, even a list of one, + "Copy account id") rather
 * than silently falling to a copy-only button with no chevron and no menu. No account-creation
 * item — the backend policy is one account per identity; `createAccount` conflicts otherwise.
 */
export const SidebarVariantSingleAccount: Story = {
  name: 'Sidebar variant — single account (the common real case)',
  args: { ...SingleAccount.args, variant: 'sidebar', initials: 'AG' },
  decorators: SidebarVariant.decorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Switch account/ }));
  },
};

export const SidebarVariantSingleAccountLight: Story = {
  name: 'Sidebar variant — single account, wireframe (light)',
  globals: { theme: 'wireframe' },
  args: SidebarVariantSingleAccount.args,
  decorators: SidebarVariant.decorators,
};
