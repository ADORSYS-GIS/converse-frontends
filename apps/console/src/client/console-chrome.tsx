'use client';

import type { NavGroup } from '@lightbridge/ui-web';
import { AccountBadge } from '@lightbridge/ui-web/src/components/account-badge';
import { AccountMenu } from '@lightbridge/ui-web/src/components/account-menu';
import {
  CommandPalette,
  CommandPaletteTrigger,
} from '@lightbridge/ui-web/src/components/command-palette';
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from '@lightbridge/ui-web/src/components/command-palette';
import { ConsoleTopBar } from '@lightbridge/ui-web/src/components/console-top-bar';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ThemeToggle } from '@lightbridge/ui-web/src/components/theme-toggle';
import { ConsoleSidebar } from '@lightbridge/ui-web/src/sections/console-sidebar';
import { useCommandPaletteShortcut } from '@lightbridge/ui-web/src/lib/use-command-palette-shortcut';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { useConsoleSession } from './session-context';
import { useConsoleScope } from './use-console-scope';
import { useConsoleTheme } from './use-console-theme';
import { signOut } from './sign-out';
import { useOnlineStatus } from './use-online-status';

/**
 * The chrome every console screen shares: the sidebar's brand/switcher/nav/footer, the mobile top
 * bar's compact equivalents, and the command palette they both open.
 *
 * All of it is mounted **once**, by `app/(console)/layout.tsx` — never by a route (console-ui
 * skill "Composition"). Nothing here re-implements a `ui-web` primitive: it composes
 * `ConsoleSidebar`, `ConsoleTopBar`, `NavGroup`, `AccountBadge`, `AccountMenu`, `ThemeToggle` and
 * `InlineStatus`, and supplies the app-specific data (routes, identity, connectivity).
 *
 * Subpath imports (`@lightbridge/ui-web/src/components/*`) rather than the package barrel are
 * deliberate: a barrel import here would pull `index.ts`'s entire re-export graph — including the
 * `d3-scale`/`d3-shape`/`d3-array`-backed chart components only the Overview route renders — into
 * the shared layout chunk every route loads. Next's dev webpack build doesn't tree-shake unused
 * re-exports (that's a production-only optimization), so this is a real, measured cost. Type-only
 * imports (`NavGroup`) stay on the barrel — they erase at compile time, so which module
 * re-exports them costs nothing.
 */

export type ConsoleRoute = 'overview' | 'api-keys' | 'manage' | 'settings' | 'admin';

const NAV_HREFS: Record<ConsoleRoute, string> = {
  overview: '/',
  'api-keys': '/api-keys',
  manage: '/manage',
  settings: '/settings',
  admin: '/admin',
};

/**
 * Nav active state comes from the pathname, not from a per-route prop — the shell no longer
 * re-mounts per route, so nothing is left to hand it a route name at mount time.
 */
export function routeFromPathname(pathname: string): ConsoleRoute {
  if (pathname.startsWith('/api-keys')) return 'api-keys';
  if (pathname.startsWith('/manage')) return 'manage';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'overview';
}

/** 10px line glyphs — structural markers, never decoration (console-ui skill). */
function NavGlyph({ shape }: { shape: 'overview' | 'keys' | 'manage' | 'settings' | 'admin' }) {
  const paths: Record<typeof shape, string> = {
    overview: 'M1 9V4m3 5V1m3 8V6m3 3V3',
    keys: 'M1 5h4M7 5a2 2 0 1 0 0 .01M5 5v2',
    manage: 'M1 2h8M1 5h8M1 8h5',
    // Two rails with an offset knob on each — deliberately close to `manage`'s three rules but
    // legibly different at 10px: settings is the same list with something set on it.
    settings: 'M1 3h8M1 7h8M4 1.5v3M6.5 5.5v3',
    admin: 'M5 1 1 3v3c0 2 4 3 4 3s4-1 4-3V3Z',
  };
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d={paths[shape]} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * The four fixed destinations plus the role-gated Operator group — shell brief (2026-08-30)
 * "Nav groups". There is no more `adminItems`/`showAdmin`/`roleLabel` axis: a gated group is
 * simply included or omitted from the array, and its own label row IS the role marker.
 *
 * `/admin` reads "Admin", not "Budget review": the route is an area with its own section switch
 * (operator overview · refill requests, now a horizontal tab row inside `AdminCentre` rather than
 * a rail sub-nav — see `containers/admin-centre.tsx`), and naming the top-level entry after one of
 * its two sections would mislabel the other.
 */
export function navGroups(active: ConsoleRoute, isAdmin: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    {
      key: 'workspace',
      label: 'Workspace',
      items: [
        {
          key: 'overview',
          label: 'Overview',
          href: NAV_HREFS.overview,
          icon: <NavGlyph shape="overview" />,
          active: active === 'overview',
        },
        {
          key: 'manage',
          label: 'Projects',
          href: NAV_HREFS.manage,
          icon: <NavGlyph shape="manage" />,
          active: active === 'manage',
        },
        {
          key: 'api-keys',
          label: 'API keys',
          href: NAV_HREFS['api-keys'],
          icon: <NavGlyph shape="keys" />,
          active: active === 'api-keys',
        },
      ],
    },
    {
      key: 'account',
      label: 'Account',
      items: [
        {
          key: 'settings',
          label: 'Settings',
          href: NAV_HREFS.settings,
          icon: <NavGlyph shape="settings" />,
          active: active === 'settings',
        },
      ],
    },
  ];
  if (isAdmin) {
    groups.push({
      key: 'operator',
      label: 'Operator',
      items: [
        {
          key: 'admin',
          label: 'Admin',
          href: NAV_HREFS.admin,
          icon: <NavGlyph shape="admin" />,
          active: active === 'admin',
        },
      ],
    });
  }
  return groups;
}

function initialsFor(name: string | undefined, email: string | undefined): string {
  const source = name ?? email ?? '';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return '··';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

const BRAND = (
  <>
    <span className="header-logo" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" />
      </svg>
    </span>
    <span className="header-wordmark">Lightbridge</span>
  </>
);

/**
 * The workspace switcher's data — shared by the sidebar's full-width row and the top bar's
 * compact one, since both are the SAME `AccountBadge` behaviour at two variants. Reads
 * `allAccounts` (raw rows), NOT `accounts` (flattened to `{id, label}` by `accountScopeLabel`,
 * which renders an unnamed account as "Unnamed account · <full uuid>"). Feeding that label to
 * `AccountBadge` as `name` would put the raw UUID back AND append the short form beside it — the
 * badge owns its own fallback; it needs the real `name`, or nothing.
 */
function useWorkspaceSwitcher() {
  const consoleScope = useConsoleScope();
  const activeAccount = consoleScope.allAccounts.find(
    (account) => account.id === consoleScope.value.accountId
  );

  return {
    accountId: consoleScope.value.accountId,
    name: activeAccount?.name,
    initials: initialsFor(activeAccount?.name ?? undefined, undefined),
    accounts: consoleScope.allAccounts.map((account) => ({ id: account.id, label: account.name })),
    onSelectAccount: (accountId: string) => consoleScope.setValue({ accountId, projectId: null }),
    onCopyId: (accountId: string) => {
      // Best-effort: `navigator.clipboard` is undefined on insecure origins. A failed copy
      // leaves the id in the tooltip, so there is nothing to recover.
      void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
    },
  };
}

/**
 * `⌘K`/`Ctrl-K` command palette, mounted once alongside the shell it opens on top of (console-ui
 * skill "Composition": chrome mounts exactly once) — the sidebar's search row and the top bar's
 * palette icon both open the SAME instance, so the shortcut listener and the dialog state exist
 * exactly once regardless of which chrome zone is visible at the current tier.
 *
 * Only **Navigate** and **Sign out** are wired — see the git history of this file for the fuller
 * "New key / Generate report / Request refill" candidates this task considered and rejected, each
 * for lacking a wired flow to reuse rather than stub.
 */
export function useConsolePalette() {
  const router = useRouter();
  const session = useConsoleSession();
  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — ephemeral interaction state). The palette is a
   * launcher, not a view: it describes nothing about what the user is looking at, it is dismissed
   * by Escape or by the first selection, and `?palette=open` in a shared link would pop a modal
   * over someone else's screen for no reason.
   */
  const [open, setOpen] = useState(false);
  useCommandPaletteShortcut(setOpen);

  const groups: CommandPaletteGroup[] = useMemo(() => {
    const navigate: CommandPaletteItem[] = [
      { key: 'overview', label: 'Overview', onSelect: () => router.push(NAV_HREFS.overview) },
      { key: 'api-keys', label: 'Api-Keys', onSelect: () => router.push(NAV_HREFS['api-keys']) },
      { key: 'manage', label: 'Manage', onSelect: () => router.push(NAV_HREFS.manage) },
      { key: 'settings', label: 'Settings', onSelect: () => router.push(NAV_HREFS.settings) },
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

  return { open, setOpen, groups };
}

export function ConsolePaletteDialog({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandPaletteGroup[];
}) {
  return <CommandPalette open={open} onOpenChange={onOpenChange} groups={groups} />;
}

/**
 * The persistent left sidebar's content — brand, workspace switcher, nav groups, and a footer
 * stack (search/palette trigger, theme, offline status, identity). `ConsoleSidebar` (`ui-web`)
 * renders both this and the mobile bottom-nav dock from the same `groups`.
 */
export function ConsoleSidebarContent({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const { preference, setPreference } = useConsoleTheme();
  const switcher = useWorkspaceSwitcher();
  const route = routeFromPathname(pathname);
  const identityLabel = session.user?.email ?? session.user?.preferredUsername ?? session.user?.name;

  return (
    <ConsoleSidebar
      brand={BRAND}
      workspaceSwitcher={
        <AccountBadge
          variant="sidebar"
          accountId={switcher.accountId}
          name={switcher.name}
          initials={switcher.initials}
          accounts={switcher.accounts}
          onSelectAccount={switcher.onSelectAccount}
          onCopyId={switcher.onCopyId}
        />
      }
      groups={navGroups(route, session.isAdmin)}
      linkComponent={Link}
      footer={
        <>
          <button type="button" onClick={onOpenPalette} className="sidebar-footer-row">
            <span className="font-sans text-[13px] text-subtle">Search</span>
            <kbd className="kbd kbd-sm ml-auto">⌘K</kbd>
          </button>
          <div className="sidebar-footer-row">
            <ThemeToggle preference={preference} onPreferenceChange={setPreference} />
            <span className="font-sans text-[13px] text-subtle">Theme</span>
          </div>
          {online ? null : (
            <div className="sidebar-footer-row">
              <InlineStatus className="text-subtle">offline · showing cached data</InlineStatus>
            </div>
          )}
          <div className="sidebar-footer-row">
            <AccountMenu
              name={session.user?.name}
              email={identityLabel}
              initials={initialsFor(session.user?.name, identityLabel)}
              onSignOut={signOut}
              theme={preference}
              onThemeChange={setPreference}
            />
          </div>
        </>
      }
    />
  );
}

/**
 * The mobile/tablet top bar's content — brand, a compact workspace switcher, the palette trigger
 * and the identity avatar. Below `md`, this replaces the sidebar entirely (nav lives in the
 * bottom dock `ConsoleSidebar` renders alongside the persistent sidebar).
 */
export function ConsoleTopBarContent({ onOpenPalette }: { onOpenPalette: () => void }) {
  const session = useConsoleSession();
  const { preference, setPreference } = useConsoleTheme();
  const switcher = useWorkspaceSwitcher();
  const identityLabel = session.user?.email ?? session.user?.preferredUsername ?? session.user?.name;

  return (
    <ConsoleTopBar
      brand={BRAND}
      workspaceSwitcher={
        <AccountBadge
          accountId={switcher.accountId}
          name={switcher.name}
          accounts={switcher.accounts}
          onSelectAccount={switcher.onSelectAccount}
          onCopyId={switcher.onCopyId}
        />
      }
      paletteTrigger={<CommandPaletteTrigger onClick={onOpenPalette} />}
      identity={
        <AccountMenu
          name={session.user?.name}
          email={identityLabel}
          initials={initialsFor(session.user?.name, identityLabel)}
          onSignOut={signOut}
          theme={preference}
          onThemeChange={setPreference}
        />
      }
    />
  );
}
