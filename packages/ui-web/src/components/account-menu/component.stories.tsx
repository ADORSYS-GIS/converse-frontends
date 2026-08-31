import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';

import { AccountMenu } from './component';

const meta: Meta<typeof AccountMenu> = {
  title: 'Shell/AccountMenu',
  component: AccountMenu,
  parameters: { layout: 'centered' },
  args: {
    name: 'Sam Lambou',
    email: 'sam@adorsys.com',
    initials: 'SL',
    onSignOut: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-chrome flex h-14 items-center px-5">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AccountMenu>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};

export const NoNameFallsBackToEmail: Story = {
  name: 'No name — email only',
  args: { name: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};

/** Base tier (<600): the email hides beside the trigger, but the avatar button stays the
 * trigger and the menu still opens with the full identity line inside. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};

/** `ConsoleSidebar`'s own footer identity row (Addition 5, owner screenshot review): a
 *  240px-wide chrome column, the same width the real sidebar renders at, so the alignment
 *  against the footer's other rows (Search, offline) is visible at its real measure — the
 *  `avatar-chip-sm` sits in the same 16px `RAIL_ICON_COLUMN_CLASS` those rows' own icons do. */
export const SidebarVariant: Story = {
  name: 'Sidebar footer — identity row',
  args: { variant: 'sidebar' },
  decorators: [
    (Story) => (
      <div className="bg-chrome w-60 p-2">
        <Story />
      </div>
    ),
  ],
};

export const SidebarVariantOpen: Story = {
  name: 'Sidebar footer — identity row, open',
  args: { variant: 'sidebar' },
  decorators: SidebarVariant.decorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const SidebarVariantLight: Story = {
  name: 'Sidebar footer — identity row, wireframe (light)',
  args: { variant: 'sidebar' },
  decorators: SidebarVariant.decorators,
  globals: { theme: 'wireframe' },
};

/*
 * ─── Corner-radius comparison (owner review, 2026-08-31) ─────────────────────────────────────
 *
 * The Menu counterpart to `CommandPalette`'s own three radius stories — same brief, same
 * mechanism: `popupClassName` overrides only THIS popup's corner radius via `cn()`/
 * `tailwind-merge`, leaving the shared `OVERLAY_CLASS` contract every dialog/tooltip/select in
 * the console still renders through untouched.
 */
export const RadiusComparison2px: Story = {
  name: 'Radius comparison — 2px (current contract, unchanged)',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};

export const RadiusComparison6px: Story = {
  name: 'Radius comparison — 6px',
  args: { popupClassName: 'rounded-[6px]' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};

export const RadiusComparison10px: Story = {
  name: 'Radius comparison — 10px',
  args: { popupClassName: 'rounded-[10px]' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
  },
};
