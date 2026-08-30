import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
        items: workspaceGroup.items.map((item) => ({ ...item, href: `/${item.key}`, onSelect: undefined })),
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
      <div className="flex h-14 w-[390px] bg-chrome">
        <Story />
      </div>
    ),
  ],
};
