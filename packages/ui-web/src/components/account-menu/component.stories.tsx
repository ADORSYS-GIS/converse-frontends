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
      <div className="flex h-14 items-center bg-chrome px-5">
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

/** The theme section (ADR 0010 Decision 5) only renders when both `theme` and `onThemeChange`
 * are supplied -- the consumer (`apps/console`) owns persistence. */
export const OpenWithThemeToggle: Story = {
  name: 'Open — theme toggle (wireframe active)',
  args: { theme: 'wireframe', onThemeChange: fn() },
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
