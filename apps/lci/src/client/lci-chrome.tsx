'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { CommandPaletteTrigger } from '@lightbridge/ui-web/src/components/command-palette';
import { ThemeToggle } from '@lightbridge/ui-web/src/components/theme-toggle';
import type { NavGroup } from '@lightbridge/ui-web/src/components/nav-spine';
import { ConsoleSidebar } from '@lightbridge/ui-web/src/sections/console-sidebar';
import { ConsoleTopBar } from '@lightbridge/ui-web/src/components/console-top-bar';
import { RAIL_ICON_COLUMN_CLASS } from '@lightbridge/ui-web/src/lib/rail-grid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useTheme } from './use-theme';

/**
 * The chrome every `apps/lci` screen shares — sidebar/top-bar brand, nav, and footer. There is no
 * account/workspace switcher, since LCI has no multi-account concept — the `workspaceSwitcher`
 * slot carries the product name, "Code Intelligence", instead (see `LciBrandMark` below for the
 * brand/name split). The command palette covers page jumps only for now (no run-id lookup yet),
 * and there's no offline banner yet either.
 */
function navGroups(pathname: string): NavGroup[] {
  return [
    {
      key: 'workspace',
      label: 'Workspace',
      items: [
        { key: 'overview', label: 'Overview', href: '/', active: pathname === '/' },
        {
          key: 'repositories',
          label: 'Repositories',
          href: '/repositories',
          active: pathname.startsWith('/repositories'),
        },
        {
          key: 'runs',
          label: 'Runs',
          href: '/runs',
          active: pathname.startsWith('/runs'),
        },
        {
          key: 'admin',
          label: 'Approvals',
          href: '/admin',
          active: pathname.startsWith('/admin'),
        },
        {
          key: 'settings',
          label: 'Settings',
          href: '/settings',
          active: pathname.startsWith('/settings'),
        },
      ],
    },
  ];
}

/**
 * The brand mark — an icon-only adorsys wordmark, no visible text beside it; the product name is
 * carried in `aria-label` instead. The dark/light PNG pair (`public/branding/`) is a static asset
 * here rather than a runtime-configured file, since this app has no white-label deployment case.
 * `brand-mark-dark`/`brand-mark-light` pick the right image per theme in pure CSS, so it resolves
 * correctly on first paint with no client-side theme read and no flash.
 */
function LciBrandMark() {
  return (
    <Link href="/" aria-label="adorsys Code Intelligence — go to home" className="header-brand">
      <img
        src="/branding/logo.png"
        alt=""
        aria-hidden="true"
        className="header-logo brand-mark-dark"
      />
      <img
        src="/branding/logo-light.png"
        alt=""
        aria-hidden="true"
        className="header-logo brand-mark-light"
      />
    </Link>
  );
}

export function LciSidebarContent({
  userLabel,
  onOpenPalette,
}: {
  userLabel: string;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const { preference, setPreference } = useTheme();

  return (
    <ConsoleSidebar
      brand={<LciBrandMark />}
      workspaceSwitcher={
        <div className="sidebar-footer-row">
          <span className="text-subtle font-sans text-[13px]">Code Intelligence</span>
        </div>
      }
      groups={navGroups(pathname)}
      linkComponent={Link}
      footer={
        <>
          <button type="button" onClick={onOpenPalette} className="sidebar-footer-row">
            <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
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
            <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
              <span aria-hidden="true" className="avatar-chip-sm">
                {userLabel.slice(0, 1).toUpperCase()}
              </span>
            </span>
            <span className="rail-row-label text-soft text-[13px]">{userLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              render={<a href="/api/auth/logout" />}
              nativeButton={false}>
              Sign out
            </Button>
          </div>
        </>
      }
    />
  );
}

export function LciTopBarContent({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { preference, setPreference } = useTheme();
  return (
    <ConsoleTopBar
      brand={<LciBrandMark />}
      workspaceSwitcher={
        <span className="text-subtle font-sans text-[13px]">Code Intelligence</span>
      }
      paletteTrigger={<CommandPaletteTrigger onClick={onOpenPalette} />}
      trailing={<ThemeToggle preference={preference} onPreferenceChange={setPreference} />}
    />
  );
}
