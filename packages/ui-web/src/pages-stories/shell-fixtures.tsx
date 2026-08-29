// Shell chrome for the page-level stories — the nav spine's items, the header identity slot and
// the section sub-navs, in one place.
//
// These are STORYBOOK-ONLY fixtures. They are never exported from `src/index.ts`: in the real app
// the same data comes from `apps/console`'s own route table and session (console-ui skill
// "Composition" — the shell mounts once, in the console's persistent layout).

import React, { useState } from 'react';

import { AccountBadge } from '../components/account-badge';
import { AccountMenu } from '../components/account-menu';
import { ConsoleHeader } from '../components/console-header';
import type { NavSpineItem } from '../components/nav-spine';
import { ThemeToggle } from '../components/theme-toggle';
import type { ThemeTogglePreference } from '../components/theme-toggle';
import type { SubNavItem } from '../components/sub-nav';

export type StoryRoute = 'overview' | 'api-keys' | 'manage' | 'settings' | 'admin';

/** 10px line glyphs — structural markers, never decoration (console-ui skill). */
function NavGlyph({ shape }: { shape: StoryRoute }) {
  const paths: Record<StoryRoute, string> = {
    overview: 'M1 9V4m3 5V1m3 8V6m3 3V3',
    'api-keys': 'M1 5h4M7 5a2 2 0 1 0 0 .01M5 5v2',
    manage: 'M1 2h8M1 5h8M1 8h5',
    // Two rails with an offset knob on each — the settings glyph, same 10px line vocabulary.
    settings: 'M1 3h8M1 7h8M4 1.5v3M6.5 5.5v3',
    admin: 'M5 1 1 3v3c0 2 4 3 4 3s4-1 4-3V3Z',
  };
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d={paths[shape]} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function storyNavItems(active: StoryRoute): NavSpineItem[] {
  return [
    {
      key: 'overview',
      label: 'Overview',
      icon: <NavGlyph shape="overview" />,
      active: active === 'overview',
    },
    {
      key: 'api-keys',
      label: 'API keys',
      icon: <NavGlyph shape="api-keys" />,
      active: active === 'api-keys',
    },
    {
      key: 'manage',
      label: 'Manage',
      icon: <NavGlyph shape="manage" />,
      active: active === 'manage',
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <NavGlyph shape="settings" />,
      active: active === 'settings',
    },
  ];
}

export function storyAdminNavItems(active: StoryRoute): NavSpineItem[] {
  return [
    {
      key: 'admin',
      label: 'Admin',
      icon: <NavGlyph shape="admin" />,
      active: active === 'admin',
    },
  ];
}

// `ThemeToggle` beside `AccountMenu`, both driven by one shared preference -- mirrors
// `apps/console/src/client/console-chrome.tsx`'s `ConsoleIdentity`, whose single `useConsoleTheme`
// instance is what actually keeps the header quick-cycle and the menu's Dark/Light/System entries
// in sync for real.
function StoryIdentity() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  return (
    <div className="flex items-center gap-4">
      <ThemeToggle preference={preference} onPreferenceChange={setPreference} />
      <AccountMenu
        name="Sam Lambou"
        email="sam@adorsys.com"
        initials="SL"
        onSignOut={() => {}}
        theme={preference}
        onThemeChange={setPreference}
      />
    </div>
  );
}

// The header is now the console's ONLY rendering of "which account am I in" (owner review
// 2026-08-29) — hence a real `AccountBadge` here rather than a bare `<span>`. The story id is the
// same UUID production serves, so the fallback path stays honest: the badge shows a name when the
// account has one and `acct_49534505` when it does not, never the raw 36 characters.
export const STORY_ACCOUNT_ID = '49534505-4c60-4550-83dd-7af22152cec6';

export const storyHeader = (
  <ConsoleHeader
    orgSwitcher={
      <AccountBadge name="adorsys-gis" accountId={STORY_ACCOUNT_ID} onCopyId={() => {}} />
    }
    identity={<StoryIdentity />}
  />
);

/** The same header with an UNNAMED account — the state production is actually in today. */
export const storyHeaderUnnamed = (
  <ConsoleHeader
    orgSwitcher={<AccountBadge accountId={STORY_ACCOUNT_ID} onCopyId={() => {}} />}
    identity={<StoryIdentity />}
  />
);

export const manageSubNavItems: SubNavItem[] = [
  { key: 'projects', label: 'Projects', count: 24, active: true },
  { key: 'accounts', label: 'Accounts', count: 3 },
  { key: 'budgets', label: 'Budgets', count: 24 },
  { key: 'members', label: 'Members', count: 17 },
];

export const settingsSubNavItems: SubNavItem[] = [
  { key: 'account', label: 'Account', active: true },
  { key: 'projects', label: 'Projects', count: 3 },
];

export const adminSubNavItems: SubNavItem[] = [
  { key: 'budget-review', label: 'Budget review', count: 4, active: true },
  { key: 'org-config', label: 'Org config' },
  { key: 'roles', label: 'Roles', count: 3 },
];
