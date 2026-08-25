'use client';

import type { NavSpineItem } from '@lightbridge/ui-web';
import { AccountMenu } from '@lightbridge/ui-web/src/components/account-menu';
import { CommandPalette, CommandPaletteTrigger } from '@lightbridge/ui-web/src/components/command-palette';
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from '@lightbridge/ui-web/src/components/command-palette';
import { ConsoleHeader } from '@lightbridge/ui-web/src/components/console-header';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { useCommandPaletteShortcut } from '@lightbridge/ui-web/src/lib/use-command-palette-shortcut';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { useConsoleSession } from './session-context';
import { useConsoleTheme } from './use-console-theme';
import { signOut } from './sign-out';
import { useOnlineStatus } from './use-online-status';

/**
 * The chrome every console screen shares: the nav spine's items, the header identity slot, and the
 * offline status line.
 *
 * All of it is mounted **once**, by `app/(console)/layout.tsx` — never by a route (console-ui
 * skill "Composition"). Nothing here re-implements a `ui-web` primitive: it composes
 * `ConsoleHeader`, `NavSpineItem` and `InlineStatus` and supplies the app-specific data (routes,
 * identity, connectivity).
 *
 * `ConsoleHeader`/`InlineStatus`/`AccountMenu` are imported from their own
 * `@lightbridge/ui-web/src/components/*` subpaths rather than the package's barrel on purpose:
 * a barrel import here would pull `index.ts`'s entire re-export graph — including the
 * `d3-scale`/`d3-shape`/`d3-array`-backed chart components only the Overview route renders — into
 * the shared layout chunk every route loads. Next's dev webpack build doesn't tree-shake unused
 * re-exports (that's a production-only optimization), so this is a real, measured cost.
 * `@lightbridge/ui-web`'s `package.json` already publishes a `"./src/*"` subpath export for
 * exactly this. Type-only imports (`NavSpineItem`) stay on the barrel — they erase at compile
 * time, so which module they're re-exported from is free.
 */

export type ConsoleRoute = 'overview' | 'api-keys' | 'manage' | 'admin';

const NAV_HREFS: Record<ConsoleRoute, string> = {
  overview: '/',
  'api-keys': '/api-keys',
  manage: '/manage',
  admin: '/admin',
};

/**
 * Nav active state comes from the pathname, not from a per-route prop — the shell no longer
 * re-mounts per route, so nothing is left to hand it a route name at mount time.
 */
export function routeFromPathname(pathname: string): ConsoleRoute {
  if (pathname.startsWith('/api-keys')) return 'api-keys';
  if (pathname.startsWith('/manage')) return 'manage';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'overview';
}

/** 10px line glyphs — structural markers, never decoration (console-ui skill). */
function NavGlyph({ shape }: { shape: 'overview' | 'keys' | 'manage' | 'admin' }) {
  const paths: Record<typeof shape, string> = {
    overview: 'M1 9V4m3 5V1m3 8V6m3 3V3',
    keys: 'M1 5h4M7 5a2 2 0 1 0 0 .01M5 5v2',
    manage: 'M1 2h8M1 5h8M1 8h5',
    admin: 'M5 1 1 3v3c0 2 4 3 4 3s4-1 4-3V3Z',
  };
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d={paths[shape]} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function navItems(active: ConsoleRoute): NavSpineItem[] {
  return [
    {
      key: 'overview',
      label: 'Overview',
      href: NAV_HREFS.overview,
      icon: <NavGlyph shape="overview" />,
      active: active === 'overview',
    },
    {
      key: 'api-keys',
      label: 'API keys',
      href: NAV_HREFS['api-keys'],
      icon: <NavGlyph shape="keys" />,
      active: active === 'api-keys',
    },
    {
      key: 'manage',
      label: 'Manage',
      href: NAV_HREFS.manage,
      icon: <NavGlyph shape="manage" />,
      active: active === 'manage',
    },
  ];
}

export function adminNavItems(active: ConsoleRoute): NavSpineItem[] {
  return [
    {
      key: 'admin',
      label: 'Budget review',
      href: NAV_HREFS.admin,
      icon: <NavGlyph shape="admin" />,
      active: active === 'admin',
    },
  ];
}

function initialsFor(name: string | undefined, email: string | undefined): string {
  const source = name ?? email ?? '';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return '··';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Identity + connectivity, in the header's right-hand slot.
 *
 * Offline is reported as an inline mono status line, per the console-ui skill: no toast, no
 * banner, no modal. The cache is still serving the screen, so the message says exactly that.
 */
export function ConsoleIdentity() {
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const { preference, setPreference } = useConsoleTheme();
  const label = session.user?.email ?? session.user?.preferredUsername ?? session.user?.name;

  return (
    <div className="flex items-center gap-4">
      {online ? null : (
        <InlineStatus className="text-subtle">offline · showing cached data</InlineStatus>
      )}
      <AccountMenu
        name={session.user?.name}
        email={label}
        initials={initialsFor(session.user?.name, label)}
        onSignOut={signOut}
        theme={preference}
        onThemeChange={setPreference}
      />
    </div>
  );
}

/**
 * `⌘K`/`Ctrl-K` command palette, mounted once alongside the shell it opens on
 * top of (console-ui skill "Composition": chrome mounts exactly once).
 *
 * `CommandPalette` itself is a pure, controlled `ui-web` component with no
 * routing knowledge -- `apps/console` supplies the routes and actions. Only
 * **Navigate** and **Sign out** are wired here, not the full "New key /
 * Generate report / Request refill / Sign out" action set the console-ui skill
 * sketches as an example: those three route-scoped actions each fail the
 * "existing flow" bar this task set —
 *   - `New key` *creates a real key* (`useApiKeysScreen().createKey`), but the
 *     one-time secret it returns is only ever rendered by `ApiKeysLedger`
 *     inside `ApiKeysCentre`, which mounts exclusively on `/api-keys`. Firing
 *     it from another route would create a real credential with literally no
 *     UI anywhere to show or copy it -- worse than a stub, a silent data-loss
 *     footgun, so it stays a per-route action (the rail + heading buttons).
 *   - `Generate report` (`useManageScreen().report.onGenerate`) is itself
 *     already an honest placeholder in `apps/console` today -- it patches a
 *     notice reading "needs the consumption report route ... not wired yet".
 *     There is no real flow to reuse yet.
 *   - `Request refill` has no `onRequestRefill` wired anywhere in
 *     `apps/console` (`BudgetPanel`'s prop is never passed).
 * Per this task's own instruction ("omit actions that have no wired flow
 * rather than stubbing dead items"), all three are omitted here. Revisit once
 * report export ships and the secret-reveal surface is lifted above the
 * per-route centre.
 */
function ConsolePalette() {
  const router = useRouter();
  const session = useConsoleSession();
  const [open, setOpen] = useState(false);
  useCommandPaletteShortcut(setOpen);

  const groups: CommandPaletteGroup[] = useMemo(() => {
    const navigate: CommandPaletteItem[] = [
      { key: 'overview', label: 'Overview', onSelect: () => router.push(NAV_HREFS.overview) },
      { key: 'api-keys', label: 'Api-Keys', onSelect: () => router.push(NAV_HREFS['api-keys']) },
      { key: 'manage', label: 'Manage', onSelect: () => router.push(NAV_HREFS.manage) },
    ];
    if (session.isAdmin) {
      navigate.push({
        key: 'admin',
        label: 'Admin',
        hint: 'ROLE',
        onSelect: () => router.push(NAV_HREFS.admin),
      });
    }
    return [
      { key: 'navigate', heading: 'Navigate', items: navigate },
      {
        key: 'actions',
        heading: 'Actions',
        items: [{ key: 'sign-out', label: 'Sign out', onSelect: signOut }],
      },
    ];
  }, [router, session.isAdmin]);

  return (
    <>
      <CommandPaletteTrigger onClick={() => setOpen(true)} />
      <CommandPalette open={open} onOpenChange={setOpen} groups={groups} />
    </>
  );
}

export function ConsoleHeaderBar({ orgSwitcher }: { orgSwitcher?: React.ReactNode }) {
  return (
    <ConsoleHeader
      orgSwitcher={orgSwitcher}
      paletteTrigger={<ConsolePalette />}
      identity={<ConsoleIdentity />}
    />
  );
}
