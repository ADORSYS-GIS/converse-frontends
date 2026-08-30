// Shell chrome for the page-level stories — the nav groups, the sidebar/top-bar brand and
// workspace-switcher slots, and the section sub-navs, in one place.
//
// These are STORYBOOK-ONLY fixtures. They are never exported from `src/index.ts`: in the real app
// the same data comes from `apps/console`'s own route table and session (console-ui skill
// "Composition" — the shell mounts once, in the console's persistent layout).
//
// Shell brief (2026-08-30): `ConsoleHeader` is gone, replaced by `ConsoleSidebar` (persistent
// `md`+ column, brand/switcher/nav/footer) and `ConsoleTopBar` (mobile/tablet 48px band). This
// file builds both from the same brand/switcher fixtures so the two chrome forms stay visually
// consistent across every page story.

import React, { useState } from 'react';

import { AccountBadge } from '../components/account-badge';
import { AccountMenu } from '../components/account-menu';
import { ConsoleSidebar } from '../sections/console-sidebar';
import { ConsoleTopBar } from '../components/console-top-bar';
import type { NavGroup, NavSpineItem } from '../components/nav-spine';
import { ThemeToggle } from '../components/theme-toggle';
import type { ThemeTogglePreference } from '../components/theme-toggle';
import type { SubNavItem } from '../components/sub-nav';

export type StoryRoute = 'overview' | 'api-keys' | 'projects' | 'settings' | 'admin';

/** 10px line glyphs — structural markers, never decoration (console-ui skill). */
function NavGlyph({ shape }: { shape: StoryRoute }) {
  const paths: Record<StoryRoute, string> = {
    overview: 'M1 9V4m3 5V1m3 8V6m3 3V3',
    'api-keys': 'M1 5h4M7 5a2 2 0 1 0 0 .01M5 5v2',
    projects: 'M1 2h8M1 5h8M1 8h5',
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

function storyPrimaryItems(active: StoryRoute): NavSpineItem[] {
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
      key: 'projects',
      label: 'Projects',
      icon: <NavGlyph shape="projects" />,
      active: active === 'projects',
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <NavGlyph shape="settings" />,
      active: active === 'settings',
    },
  ];
}

function storyAdminItems(active: StoryRoute): NavSpineItem[] {
  return [
    {
      key: 'admin',
      label: 'Admin',
      icon: <NavGlyph shape="admin" />,
      active: active === 'admin',
    },
  ];
}

/**
 * The nav groups every page story's `ConsoleSidebar` renders. Gating the Admin group is now just
 * whether it is included in this array at all (shell brief 2026-08-30 — `adminItems`/`showAdmin`/
 * `roleLabel` are gone from `NavSpineProps`; a caller that wants a gated group includes or omits
 * it from `groups`).
 */
export function storyNavGroups(active: StoryRoute, isAdmin = false): NavGroup[] {
  return [
    { key: 'primary', items: storyPrimaryItems(active) },
    ...(isAdmin ? [{ key: 'admin', label: 'Operator', items: storyAdminItems(active) }] : []),
  ];
}

// `ThemeToggle` beside `AccountMenu`, both driven by one shared preference -- mirrors
// `apps/console/src/client/console-chrome.tsx`'s `ConsoleIdentity`, whose single `useConsoleTheme`
// instance is what actually keeps the sidebar footer's quick-cycle and the menu's Dark/Light/
// System entries in sync for real.
function StoryFooter() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  return (
    <div className="flex items-center justify-between gap-2">
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

// The compact `ConsoleTopBar` equivalent of `StoryFooter` — same identity, no theme toggle (the
// mobile/tablet band has no room for one; the sidebar footer is the one place it lives).
function StoryTopBarIdentity() {
  const [theme, setTheme] = useState<ThemeTogglePreference>('black');
  return (
    <AccountMenu
      name="Sam Lambou"
      email="sam@adorsys.com"
      initials="SL"
      onSignOut={() => {}}
      theme={theme}
      onThemeChange={setTheme}
    />
  );
}

// The sidebar/top-bar's ONLY rendering of "which account am I in" (owner review 2026-08-29) —
// hence a real `AccountBadge` here rather than a bare `<span>`. The story id is the same UUID
// production serves, so the fallback path stays honest: the badge shows a name when the account
// has one and `acct_49534505` when it does not, never the raw 36 characters.
export const STORY_ACCOUNT_ID = '49534505-4c60-4550-83dd-7af22152cec6';

// A tiny brand fixture standing in for the old `ConsoleHeader`'s logo box + wordmark — these are
// Storybook fixtures, not production chrome, so a plain marker plus a wordmark string is enough.
export const storyBrand = (
  <span className="inline-flex items-center gap-2 font-mono text-xs tracking-wide">
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
    </svg>
    LIGHTBRIDGE
  </span>
);

export const storyWorkspaceSwitcher = (
  <AccountBadge
    variant="sidebar"
    initials="AG"
    name="adorsys-gis"
    accountId={STORY_ACCOUNT_ID}
    onCopyId={() => {}}
  />
);

/** The same switcher with an UNNAMED account — the state production is actually in today. */
export const storyWorkspaceSwitcherUnnamed = (
  <AccountBadge variant="sidebar" accountId={STORY_ACCOUNT_ID} onCopyId={() => {}} />
);

export const storyTopBarWorkspaceSwitcher = (
  <AccountBadge name="adorsys-gis" accountId={STORY_ACCOUNT_ID} onCopyId={() => {}} />
);

export const storyTopBarWorkspaceSwitcherUnnamed = (
  <AccountBadge accountId={STORY_ACCOUNT_ID} onCopyId={() => {}} />
);

/**
 * A fully-composed `ConsoleSidebar` for a page story — the `sidebar` prop every `ConsoleShell` in
 * `pages-stories/` and `refine-mock/` now takes. `unnamed` swaps in the unnamed-account switcher
 * fixture (`storyHeaderUnnamed`'s old job).
 */
export function storySidebar(
  active: StoryRoute,
  { isAdmin = false, unnamed = false }: { isAdmin?: boolean; unnamed?: boolean } = {}
) {
  return (
    <ConsoleSidebar
      brand={storyBrand}
      workspaceSwitcher={unnamed ? storyWorkspaceSwitcherUnnamed : storyWorkspaceSwitcher}
      groups={storyNavGroups(active, isAdmin)}
      footer={<StoryFooter />}
    />
  );
}

/** A fully-composed `ConsoleTopBar` for a page story — the `topBar` prop `ConsoleShell` takes. */
export function storyTopBar({ unnamed = false }: { unnamed?: boolean } = {}) {
  return (
    <ConsoleTopBar
      brand={storyBrand}
      workspaceSwitcher={
        unnamed ? storyTopBarWorkspaceSwitcherUnnamed : storyTopBarWorkspaceSwitcher
      }
      identity={<StoryTopBarIdentity />}
    />
  );
}

export const settingsSubNavItems: SubNavItem[] = [
  { key: 'account', label: 'Account', active: true },
  { key: 'projects', label: 'Projects', count: 3 },
];
