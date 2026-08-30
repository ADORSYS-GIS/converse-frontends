import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AccountBadge } from '../../components/account-badge';
import { AccountMenu } from '../../components/account-menu';
import type { NavGroup } from '../../components/nav-spine';
import {
  AdminIcon,
  KeysIcon,
  OverviewIcon,
  ProjectsIcon,
  SearchIcon,
  SettingsIcon,
} from '../../lib/icons';
import { RAIL_ICON_COLUMN_CLASS, RAIL_ICON_SIZE, RAIL_ICON_STROKE_WIDTH } from '../../lib/rail-grid';
import { ConsoleSidebar } from './component';

// This fixture now composes the SAME parts `apps/console/src/client/console-chrome.tsx` does —
// the real `AccountBadge`/`AccountMenu` components and the real `lib/icons.tsx` glyph set, not a
// hand-rolled stand-in for either (owner rework, 2026-08-30: a previous pass of this story drew
// its own 10x10 `Glyph` placeholder and its own inline workspace-switcher button, which happened
// to already read at the CORRECT 13px/26px-vs-20px mix of sizes — so this story kept passing
// visual review while the real `AccountBadge` rendered its name at `SECTION_TITLE_CLASS` (15px)
// and the real `lib/icons.tsx` key glyph painted with no visible teeth. A story that stands in
// for the real subcomponents cannot catch a regression that lives IN them; this is why "app and
// stories agree" is a contract about which components render, not just which classes are typed
// out. Stories are the acceptance surface (console-ui skill "Composition") — only real components
// hold that line.
const NAV_ICON = {
  overview: <OverviewIcon />,
  keys: <KeysIcon />,
  projects: <ProjectsIcon />,
  settings: <SettingsIcon />,
  admin: <AdminIcon />,
};

const groups: NavGroup[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    items: [
      { key: 'overview', label: 'Overview', icon: NAV_ICON.overview, active: true },
      { key: 'projects', label: 'Projects', icon: NAV_ICON.projects },
      { key: 'api-keys', label: 'API keys', icon: NAV_ICON.keys },
    ],
  },
  {
    key: 'account',
    label: 'Account',
    items: [{ key: 'settings', label: 'Settings', icon: NAV_ICON.settings }],
  },
];

const operatorGroup: NavGroup = {
  key: 'operator',
  label: 'Operator',
  items: [{ key: 'admin', label: 'Refill requests', icon: NAV_ICON.admin, count: 3 }],
};

// The brand mark — same 16px box / 1.5 stroke contract as every nav glyph (`lib/rail-grid.ts`'s
// `RAIL_ICON_SIZE`/`RAIL_ICON_STROKE_WIDTH`), same triangle path `console-chrome.tsx`'s `BRAND`
// draws, so a story reviewer sees the exact mark the app ships rather than a stand-in silhouette.
const brand = (
  <>
    <span className="header-logo" aria-hidden="true">
      <svg
        width={RAIL_ICON_SIZE}
        height={RAIL_ICON_SIZE}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={RAIL_ICON_STROKE_WIDTH}
        strokeLinejoin="round">
        <path d="M2 14 8 2 14 14Z" />
      </svg>
    </span>
    <span className="header-wordmark">Lightbridge</span>
  </>
);

const workspaceSwitcher = (
  <AccountBadge
    variant="sidebar"
    accountId="49534505-4c60-4550-83dd-7af22152cec6"
    name="adorsys-gis"
    initials="AG"
    accounts={[
      { id: '49534505-4c60-4550-83dd-7af22152cec6', label: 'adorsys-gis' },
      { id: '7af22152-4c60-4550-83dd-49534505cec6', label: 'sandbox' },
    ]}
    onSelectAccount={fn()}
    onCopyId={fn()}
    onCreateAccount={fn()}
  />
);

// Addition 5 (owner review): the standalone Theme row is gone — theme lives only inside
// `AccountMenu`'s own popup now, one control instead of two. Search's icon and the identity
// chip both sit in the SAME `w-4` (16px) column `NavSpine`'s own rows use (`RAIL_ICON_COLUMN_CLASS`
// in the real chrome), so this fixture mirrors that instead of drifting back to a hand-picked x.
const footer = (
  <>
    <button type="button" className="sidebar-footer-row">
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
        <SearchIcon />
      </span>
      <span className="font-sans text-[13px] text-subtle">Search</span>
      <span className="kbd kbd-sm ml-auto">⌘K</span>
    </button>
    <AccountMenu
      variant="sidebar"
      name="Sam Lambou"
      email="sam@adorsys.com"
      initials="SL"
      onSignOut={fn()}
      theme="black"
      onThemeChange={fn()}
    />
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
