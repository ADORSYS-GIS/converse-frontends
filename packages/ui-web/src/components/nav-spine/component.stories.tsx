import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { NavSpine } from './component';
import type { NavGroup } from './types';

function Glyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" />
    </svg>
  );
}

const workspaceGroup: NavGroup = {
  key: 'workspace',
  label: 'Workspace',
  items: [
    { key: 'overview', label: 'Overview', icon: <Glyph />, active: true },
    { key: 'api-keys', label: 'Api-Keys', icon: <Glyph /> },
    { key: 'manage', label: 'Manage', icon: <Glyph /> },
  ],
};
const accountGroup: NavGroup = {
  key: 'account',
  label: 'Account',
  items: [{ key: 'settings', label: 'Settings', icon: <Glyph /> }],
};
const operatorGroup: NavGroup = {
  key: 'operator',
  label: 'Operator',
  items: [{ key: 'admin', label: 'Admin', icon: <Glyph /> }],
};

// `sidebar` (default) layout decorator — frames the story the way `ConsoleSidebar` actually hosts
// it: a flush `chrome` column, no floating panel.
function sidebarDecorator(Story: () => React.ReactElement) {
  return (
    <div className="bg-chrome w-60 p-2">
      <Story />
    </div>
  );
}

const meta: Meta<typeof NavSpine> = {
  title: 'Shell/NavSpine',
  component: NavSpine,
};

export default meta;
type Story = StoryObj<typeof NavSpine>;

export const Member: Story = {
  args: { groups: [workspaceGroup, accountGroup], layout: 'sidebar' },
  decorators: [sidebarDecorator],
};

export const WithOperatorGroup: Story = {
  args: { groups: [workspaceGroup, accountGroup, operatorGroup], layout: 'sidebar' },
  decorators: [sidebarDecorator],
};

export const AsLinks: Story = {
  args: {
    groups: [
      {
        ...workspaceGroup,
        items: workspaceGroup.items.map((item) => ({
          ...item,
          href: `/${item.key}`,
          onSelect: undefined,
        })),
      },
    ],
    layout: 'sidebar',
  },
  decorators: [sidebarDecorator],
};

// Mobile-first (<600) bottom navigation dock — console-ui skill "Shape and layout". Rendered by
// `ConsoleSidebar` inside a fixed h-14 `chrome` bar; this story reproduces just that frame.
export const BottomBar: Story = {
  args: { groups: [workspaceGroup, accountGroup, operatorGroup], layout: 'bottom-bar' },
  decorators: [
    (Story) => (
      <div className="bg-chrome flex h-14 w-[390px]">
        <Story />
      </div>
    ),
  ],
};

// Owner finding, 2026-08-31 (issue #368) — "I have the role lightbridge-admin and yet I can't see
// roles": the `/settings` "Roles" row rendered `disabled` with a stated reason while no read API
// for role mappings existed. It is a LIVE row now (converse-frontends#452 — `/admin/roles`, backed
// by `platform_role_grants`), so this story no longer mirrors a real console row; it keeps
// documenting the DISABLED-row treatment itself, which the contract still allows for any
// destination that genuinely is not built. The label stays at its normal position, "Unavailable" is a small
// always-visible trailing annotation (no interaction needed to see THAT it's unavailable), and
// the `play` function focuses the row so Storybook's default snapshot shows the reason tooltip
// actually open — proving it surfaces, not just that the row renders.
const disabledGroup: NavGroup = {
  key: 'settings',
  items: [
    { key: 'overview', label: 'Overview', icon: <Glyph />, active: true },
    {
      key: 'roles',
      label: 'Roles',
      icon: <Glyph />,
      disabled: true,
      reason:
        'Role and permission mapping is operator config today; no read API exists (lightbridge-authz#571).',
    },
    { key: 'tiers', label: 'Tier configs', icon: <Glyph /> },
  ],
};

export const DisabledWithReason: Story = {
  name: 'Disabled row — reason tooltip open',
  args: { groups: [disabledGroup], layout: 'sidebar' },
  decorators: [sidebarDecorator],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab(); // focuses Overview first (natural tab order)
    await userEvent.tab(); // ...then Roles, the disabled row
    void canvas; // the tooltip portals outside canvasElement — nothing further to query here
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const DisabledWithReasonLight: Story = {
  name: 'Disabled row — reason tooltip open, wireframe (light)',
  args: { groups: [disabledGroup], layout: 'sidebar' },
  decorators: [sidebarDecorator],
  globals: { theme: 'wireframe' },
  play: DisabledWithReason.play,
};
