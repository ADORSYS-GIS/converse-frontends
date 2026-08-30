import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { NavGroup } from '../../components/nav-spine';
import { ConsoleSidebar } from './component';

function Glyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" />
    </svg>
  );
}

const groups: NavGroup[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    items: [
      { key: 'overview', label: 'Overview', icon: <Glyph />, active: true },
      { key: 'api-keys', label: 'Api-Keys', icon: <Glyph /> },
      { key: 'manage', label: 'Projects', icon: <Glyph /> },
    ],
  },
  { key: 'account', label: 'Account', items: [{ key: 'settings', label: 'Settings', icon: <Glyph /> }] },
];

const operatorGroup: NavGroup = {
  key: 'operator',
  label: 'Operator',
  items: [{ key: 'admin', label: 'Admin', icon: <Glyph /> }],
};

const brand = (
  <>
    <span className="header-logo" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
      </svg>
    </span>
    <span className="header-wordmark">Lightbridge</span>
  </>
);

const workspaceSwitcher = (
  <button type="button" className="workspace-switcher-row">
    <span aria-hidden="true" className="avatar-chip">
      AG
    </span>
    <span className="truncate font-sans text-[13px] text-ink">adorsys-gis</span>
  </button>
);

// Addition 5 (owner review): the standalone Theme row is gone — theme lives only inside
// `AccountMenu`'s own popup now, one control instead of two. Search's icon and the identity
// chip both sit in the SAME `w-4` (16px) column `NavSpine`'s own rows use (`RAIL_ICON_COLUMN_CLASS`
// in the real chrome), so this fixture mirrors that instead of drifting back to a hand-picked x.
const footer = (
  <>
    <button type="button" className="sidebar-footer-row">
      <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center">
        <Glyph />
      </span>
      <span className="font-sans text-[13px] text-subtle">Search</span>
      <span className="kbd kbd-sm ml-auto">⌘K</span>
    </button>
    <button type="button" className="sidebar-footer-row">
      <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center">
        <span aria-hidden="true" className="avatar-chip-sm">
          SL
        </span>
      </span>
      <span className="rail-row-label truncate font-sans text-[13px] text-soft">
        sam@adorsys.com
      </span>
    </button>
  </>
);

const meta: Meta<typeof ConsoleSidebar> = {
  title: 'Sections/ConsoleSidebar',
  component: ConsoleSidebar,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ConsoleSidebar>;

export const Member: Story = {
  args: { brand, workspaceSwitcher, groups, footer },
  render: (args) => (
    <div className="h-[640px]">
      <ConsoleSidebar {...args} />
    </div>
  ),
};

export const WithOperatorGroup: Story = {
  args: { brand, workspaceSwitcher, groups: [...groups, operatorGroup], footer },
  render: (args) => (
    <div className="h-[640px]">
      <ConsoleSidebar {...args} />
    </div>
  ),
};

export const MemberLight: Story = {
  name: 'Member — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Member.args,
  render: Member.render,
};
