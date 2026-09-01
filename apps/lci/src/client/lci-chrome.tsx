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
 * The chrome every `apps/lci` screen shares — sidebar/top-bar brand, nav, and footer. Mirrors
 * `apps/console/src/client/console-chrome.tsx`'s shape, trimmed to what LCI actually has: no
 * account/workspace switcher (LCI has no multi-account concept — the `workspaceSwitcher` slot
 * carries the app name instead), no command-palette groups beyond page jumps (no run-id lookup
 * yet — that ports once the Runs screen does), no offline banner (not wired yet).
 *
 * Only two routes exist so far (`/`, `/repositories`) — Runs, Admin, and Settings render as real,
 * honest disabled rows (`NavSpineItem.reason`, ADR 0013 D2's pattern) rather than being omitted
 * or linking to a 404: this is what a mid-migration nav looks like, stated outright.
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
          disabled: true,
          reason: 'Not yet ported from lightbridge-code-intelligence/apps/web (epic #328).',
        },
        {
          key: 'admin',
          label: 'Approvals',
          disabled: true,
          reason: 'Not yet ported from lightbridge-code-intelligence/apps/web (epic #328).',
        },
        {
          key: 'settings',
          label: 'Settings',
          disabled: true,
          reason: 'Not yet ported from lightbridge-code-intelligence/apps/web (epic #328).',
        },
      ],
    },
  ];
}

function Brand() {
  return (
    <Link href="/" className="sidebar-footer-row">
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
        <span aria-hidden="true" className="avatar-chip-sm">
          L
        </span>
      </span>
      <span className="rail-row-label text-ink text-[13px] font-medium">Code Intelligence</span>
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
      brand={<Brand />}
      workspaceSwitcher={
        <div className="sidebar-footer-row">
          <span className="text-subtle font-sans text-[13px]">Lightbridge</span>
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
      brand={<Brand />}
      workspaceSwitcher={<span className="text-subtle font-sans text-[13px]">Lightbridge</span>}
      paletteTrigger={<CommandPaletteTrigger onClick={onOpenPalette} />}
      trailing={<ThemeToggle preference={preference} onPreferenceChange={setPreference} />}
    />
  );
}
