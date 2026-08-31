import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { NavGroup } from '../nav-spine';
import { ConsoleSidebar } from '../../sections/console-sidebar';
import { MutationFailureBanner } from '../mutation-failure-banner';
import { ConsoleTopBar } from '../console-top-bar';
import { ConsoleShell } from './component';

function Glyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" />
    </svg>
  );
}

function navGroups(showAdmin: boolean): NavGroup[] {
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
    {
      key: 'account',
      label: 'Account',
      items: [{ key: 'settings', label: 'Settings', icon: <Glyph /> }],
    },
  ];
  if (showAdmin) {
    groups.push({
      key: 'operator',
      label: 'Operator',
      items: [{ key: 'admin', label: 'Admin', icon: <Glyph /> }],
    });
  }
  return groups;
}

// Same mark `console-chrome.tsx`'s real `BRAND` renders (owner findings, 2026-08-31: the logo is
// a link to `/`, and once a logo renders the `Lightbridge` wordmark text is dropped — an
// `aria-label` on the link carries the accessible name instead).
const brand = (
  <a href="/" aria-label="Lightbridge — go to console home" className="header-brand focus-ring">
    <span className="header-logo" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
      </svg>
    </span>
  </a>
);

const workspaceSwitcher = (
  <button type="button" className="workspace-switcher-row">
    <span aria-hidden="true" className="avatar-chip-md">
      AG
    </span>
    <span className="text-ink truncate font-sans text-[13px]">adorsys-gis</span>
  </button>
);

const compactWorkspaceSwitcher = (
  <span className="text-ink font-sans text-[13px]">adorsys-gis</span>
);

const identity = (
  <span aria-hidden="true" className="avatar-chip-md">
    SL
  </span>
);

const footer = (
  <>
    <button type="button" className="sidebar-footer-row">
      <span className="text-subtle font-sans text-[13px]">Search</span>
      <span className="kbd kbd-sm ml-auto">⌘K</span>
    </button>
    <div className="sidebar-footer-row">
      <span className="text-subtle font-sans text-[13px]">Theme</span>
    </div>
    <div className="sidebar-footer-row">
      {identity}
      <span className="text-subtle truncate font-sans text-[12px]">sam@adorsys.com</span>
    </div>
  </>
);

const statCard = (label: string, value: string) => (
  <div className="console-card w-full shrink-0 md:w-[209px]">
    <div className="text-subtle mb-4 font-sans text-[12px]">{label}</div>
    <div className="text-ink font-mono text-2xl">{value}</div>
  </div>
);

const quickSettingsRail = (
  <div className="flex flex-col gap-4 p-5">
    <span className="text-ink font-sans text-[15px] font-medium">adorsys-gis</span>
    <div className="settings-list">
      <div className="settings-row">
        <div className="settings-row-main">
          <span className="text-ink font-sans text-[13px]">Account name</span>
        </div>
        <div className="settings-row-value">
          <span className="text-soft font-sans text-[13px]">adorsys-gis</span>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row-main">
          <span className="text-ink font-sans text-[13px]">Account id</span>
        </div>
        <div className="settings-row-value">
          <span className="text-soft font-mono text-[13px]">acct_9f3a2b1c</span>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row-main">
          <span className="text-ink font-sans text-[13px]">Quota tier</span>
        </div>
        <div className="settings-row-value">
          <span className="text-soft font-sans text-[13px]">growth</span>
        </div>
      </div>
    </div>
  </div>
);

function Shell({
  showAdmin,
  banner,
  rail,
}: {
  showAdmin: boolean;
  banner?: React.ReactNode;
  rail?: React.ReactNode;
}) {
  // Storybook's own controlled-width owner — the real one is `apps/console`'s `use-rail-width.ts`
  // (a localStorage-backed preference); this stands in for it so the story's rail is actually
  // draggable/keyboard-resizable rather than frozen at the default.
  const [railWidth, setRailWidth] = React.useState(280);

  return (
    <ConsoleShell
      sidebar={
        <ConsoleSidebar
          brand={brand}
          workspaceSwitcher={workspaceSwitcher}
          groups={navGroups(showAdmin)}
          footer={footer}
        />
      }
      topBar={
        <ConsoleTopBar
          brand={brand}
          workspaceSwitcher={compactWorkspaceSwitcher}
          trailing={identity}
        />
      }
      rail={rail}
      railWidth={railWidth}
      onRailWidthChange={setRailWidth}
      banner={banner}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-ink font-sans text-[24px] font-semibold">Overview</h1>
          <p className="text-subtle font-sans text-[13px]">
            adorsys-gis · all projects · last 30 days · UTC
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          {statCard('Spend this month', '$142.55')}
          {statCard('Active projects', '6')}
          {statCard('Active API keys', '23')}
        </div>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ConsoleShell> = {
  title: 'Shell/ConsoleShell',
  component: ConsoleShell,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ConsoleShell>;

// Full shell at `lg` (1440, the default viewport), member view (no Operator group) — the sidebar
// composition, visually comparable to the shell brief's target.
export const FullShellMember: Story = {
  render: () => <Shell showAdmin={false} />,
};

// Same composition with the Operator group visible (lightbridge-admin grant).
export const FullShellAdmin: Story = {
  render: () => <Shell showAdmin />,
};

// Below `md` (a designed target — console-ui skill "Shape and layout"): the sidebar is replaced
// by the top bar, nav moves to the fixed bottom dock.
export const MobileTopBarAndDock: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Shell showAdmin={false} />,
};

// The right INSPECTOR rail (2026-08-30 owner round — "I liked it when the right rail was there").
// Visible at `lg`+ (1440, the default viewport) only, and never empty by construction: with
// nothing selected it falls back to the scope quick-settings panel — see
// `containers/inspector-rail.tsx` (apps/console) for the real resolution logic this story stands
// in for with static markup.
export const FullShellWithInspectorRail: Story = {
  render: () => <Shell showAdmin={false} rail={quickSettingsRail} />,
};

// converse-frontends#323: the console-wide mutation-failure banner sits at the top of the content
// column, sticky under whatever chrome is above it at each tier.
export const WithMutationFailureBanner: Story = {
  name: 'With an active mutation failure (converse-frontends#323)',
  render: () => (
    <Shell
      showAdmin={false}
      banner={
        <MutationFailureBanner
          message="RPC call failed with code internal (status 500): the server returned an error."
          onDismiss={() => {}}
        />
      }
    />
  ),
};
