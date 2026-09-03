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
import { Button } from '../components/button';
import { ConsoleSidebar } from '../sections/console-sidebar';
import { ConsoleTopBar } from '../components/console-top-bar';
import type { NavGroup, NavSpineItem } from '../components/nav-spine';
import { SearchIcon, SignOutIcon } from '../lib/icons';
import { RAIL_ICON_COLUMN_CLASS } from '../lib/rail-grid';
import { SelectField } from '../components/select-field';
import { ThemeToggle } from '../components/theme-toggle';
import type { ThemeTogglePreference } from '../components/theme-toggle';

export type StoryRoute = 'overview' | 'api-keys' | 'settings' | 'admin';

/** 10px line glyphs — structural markers, never decoration (console-ui skill). */
function NavGlyph({ shape }: { shape: StoryRoute }) {
  const paths: Record<StoryRoute, string> = {
    overview: 'M1 9V4m3 5V1m3 8V6m3 3V3',
    'api-keys': 'M1 5h4M7 5a2 2 0 1 0 0 .01M5 5v2',
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

/** IA v3 phase E ("the settings/accounts move"): the Workspace group narrows to Overview/API
 *  keys — Projects moved to `/settings/accounts/<id>/projects`, off the account area entirely
 *  (`console-chrome.tsx`'s own `navGroups`). */
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
      key: 'settings',
      label: 'Settings',
      icon: <NavGlyph shape="settings" />,
      active: active === 'settings',
    },
  ];
}

/**
 * The nav items every page story's `ConsoleSidebar` renders: one flat group of destinations, plus
 * the permission-gated "Admin" row as its OWN labelled group when `showAdmin` is set.
 *
 * **The Admin row is back on the ACCOUNT rail (owner directive, 2026-09-03, verbatim: "The Admin
 * button doesn't need to be hidden now, since it's gated by permission. So it can appear on the
 * main left rail. The Roles button in Settings' left rail can safely be removed.")** — so it is
 * shown for every area EXCEPT `'settings'`, mirroring the real `navGroups`' own Operator group
 * (`console-chrome.tsx`). The settings rail (`settingsNavGroups`) carries no Admin row and no
 * Roles row at all any more; both pointed out of that area, and neither has a second home there.
 *
 * The one deliberate simplification left: `'admin'` here still renders the account-shaped rows
 * with Admin lit, where production swaps the entire rail to `adminNavGroups`' own seven
 * destinations. A page story is exercising the SCREEN, not the rail's area swap — the chrome
 * tests (`apps/console/src/client/console-chrome.test.ts`) own that.
 */
export function storyNavGroups(active: StoryRoute, showAdmin = false): NavGroup[] {
  const groups: NavGroup[] = [{ key: 'primary', items: storyPrimaryItems(active) }];
  if (showAdmin && active !== 'settings') {
    groups.push({
      key: 'operator',
      label: 'Operator',
      items: [
        {
          key: 'admin',
          label: 'Admin',
          icon: <NavGlyph shape="admin" />,
          active: active === 'admin',
        },
      ],
    });
  }
  return groups;
}

// The sidebar footer stack -- Search, Theme, then the identity row -- mirrors
// `apps/console/src/client/console-chrome.tsx`'s `ConsoleSidebarContent` exactly: Search's icon
// sits in the same `RAIL_ICON_COLUMN_CLASS` (16px) column `NavSpine`'s rows use. The standalone
// Theme row is back (owner finding, 2026-08-31: "I don't see the usage, for the theme to be
// hidden behind the account dropdown. Please put it outside") -- `ThemeToggle` is the only place
// the preference is edited. The identity row below no longer opens a menu at all (owner ruling,
// 2026-08-31, issue #368: "We don't need a drop down for the connected user, since it's in the
// left rail" -- `AccountMenu` is deleted outright): it is the SAME icon-column/label/trailing-
// control shape as the Theme row above it, with a plain trailing `Button` for the one row-scoped
// action (sign out) instead of a click-to-discover popup.
//
// The LANGUAGE row (ADR 0017) sits directly under Theme, exactly as `ConsoleSidebarContent` mounts
// it -- it was missing here while the file's own comment claimed the footer mirrored the console
// "exactly", so every page story reviewed a rail one row shorter than the one that ships. Its
// control is a `SelectField` since the owner's 2026-09-03 directive ("Language selection should be
// a dropdown"), `layout="inline"` so the trigger sizes to its own content in the trailing slot and
// `hideLabel` so the row's visible label is the only one on screen. The console's real one is
// `apps/console/src/i18n/locale-switcher.tsx`; this is the same control against a local `useState`,
// because `packages/ui-web` owns no translations (ADR 0017 D3).
function StoryFooter() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  const [locale, setLocale] = useState('en');
  return (
    <>
      <button type="button" className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
          <SearchIcon />
        </span>
        <span className="text-subtle font-sans text-[13px]">Search</span>
        <kbd className="kbd kbd-sm ml-auto">⌘K</kbd>
      </button>
      <div className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
        <span className="text-subtle font-sans text-[13px]">Theme</span>
        <ThemeToggle
          preference={preference}
          onPreferenceChange={setPreference}
          className="ml-auto"
        />
      </div>
      <div className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
        <span className="text-subtle font-sans text-[13px]">Language</span>
        <SelectField
          label="Language"
          hideLabel
          layout="inline"
          options={[
            { value: 'en', label: 'English' },
            { value: 'de', label: 'Deutsch' },
          ]}
          value={locale}
          onChange={setLocale}
          className="ml-auto"
        />
      </div>
      <div className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
          <span aria-hidden="true" className="avatar-chip-sm">
            SL
          </span>
        </span>
        <span className="rail-row-label text-soft text-[13px]">Sam Lambou</span>
        <Button variant="ghost" size="icon" aria-label="Sign out" className="ml-auto">
          <SignOutIcon />
        </Button>
      </div>
    </>
  );
}

// The compact `ConsoleTopBar` equivalent of `StoryFooter`'s Theme row — real `apps/console`
// (`ConsoleTopBarContent`) renders exactly `ThemeToggle` alone here now, no identity avatar at
// all: the `AccountMenu` `inline` variant that used to sit beside it is deleted (same ruling as
// `StoryFooter`'s comment above). Sign out stays reachable below `md` via the `⌘K` palette.
function StoryTopBarTrailing() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  return <ThemeToggle preference={preference} onPreferenceChange={setPreference} />;
}

// The sidebar/top-bar's ONLY rendering of "which account am I in" (owner review 2026-08-29) —
// hence a real `AccountBadge` here rather than a bare `<span>`. The story id is the same UUID
// production serves, so the fallback path stays honest: the badge shows a name when the account
// has one and `acct_49534505` when it does not, never the raw 36 characters.
export const STORY_ACCOUNT_ID = '49534505-4c60-4550-83dd-7af22152cec6';

// A tiny brand fixture standing in for `ConsoleSidebar`/`ConsoleTopBar`'s real `BRAND` constant
// (`apps/console/src/client/console-chrome.tsx`) — these are Storybook fixtures, not production
// chrome, so a plain marker is enough; it does not need the real mark's exact path. It DOES need
// to match the real mark's two owner-mandated behaviours (2026-08-31, issue #368) since a page
// story is the acceptance surface for what a screen renders: a link to `/`, and no visible
// "Lightbridge" wordmark now that a logo renders (the accessible name moves to the link's own
// `aria-label` instead).
export const storyBrand = (
  <a href="/" aria-label="Lightbridge — go to console home" className="header-brand focus-ring">
    <span aria-hidden="true" className="text-ink inline-flex items-center">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
      </svg>
    </span>
  </a>
);

export const storyWorkspaceSwitcher = (
  <AccountBadge
    variant="sidebar"
    initials="AG"
    name="adorsys-gis"
    accountId={STORY_ACCOUNT_ID}
    onCopyId={() => {}}
    onCreateAccount={() => {}}
  />
);

/** The same switcher with an UNNAMED account — the state production is actually in today. */
export const storyWorkspaceSwitcherUnnamed = (
  <AccountBadge
    variant="sidebar"
    accountId={STORY_ACCOUNT_ID}
    onCopyId={() => {}}
    onCreateAccount={() => {}}
  />
);

export const storyTopBarWorkspaceSwitcher = (
  <AccountBadge
    name="adorsys-gis"
    accountId={STORY_ACCOUNT_ID}
    onCopyId={() => {}}
    onCreateAccount={() => {}}
  />
);

export const storyTopBarWorkspaceSwitcherUnnamed = (
  <AccountBadge accountId={STORY_ACCOUNT_ID} onCopyId={() => {}} onCreateAccount={() => {}} />
);

/**
 * A fully-composed `ConsoleSidebar` for a page story — the `sidebar` prop every `ConsoleShell` in
 * `pages-stories/` and `refine-mock/` now takes. `unnamed` swaps in the unnamed-account switcher
 * fixture (`storyHeaderUnnamed`'s old job).
 */
export function storySidebar(
  active: StoryRoute,
  { showAdmin = false, unnamed = false }: { showAdmin?: boolean; unnamed?: boolean } = {}
) {
  return (
    <ConsoleSidebar
      brand={storyBrand}
      workspaceSwitcher={unnamed ? storyWorkspaceSwitcherUnnamed : storyWorkspaceSwitcher}
      groups={storyNavGroups(active, showAdmin)}
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
      trailing={<StoryTopBarTrailing />}
    />
  );
}
