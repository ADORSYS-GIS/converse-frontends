'use client';

import { ConsoleHeader, InlineStatus, type NavSpineItem } from '@lightbridge/ui-web';
import React from 'react';

import { useConsoleSession } from './session-context';
import { useOnlineStatus } from './use-online-status';

/**
 * The chrome every console screen shares: the nav spine's items, the header identity slot, and the
 * offline status line.
 *
 * Nothing here re-implements a `ui-web` primitive — it composes `ConsoleHeader`, `NavSpineItem`
 * and `InlineStatus` and supplies the app-specific data (routes, identity, connectivity).
 */

export type ConsoleRoute = 'overview' | 'api-keys' | 'manage' | 'admin';

const NAV_HREFS: Record<ConsoleRoute, string> = {
  overview: '/',
  'api-keys': '/api-keys',
  manage: '/manage',
  admin: '/admin',
};

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
 * Offline is reported as an inline mono status line, per the console-ui skill: no toast, no banner,
 * no modal. The cache is still serving the screen, so the message says exactly that.
 */
export function ConsoleIdentity() {
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const label = session.user?.email ?? session.user?.preferredUsername ?? session.user?.name;

  return (
    <div className="flex items-center gap-4">
      {online ? null : (
        <InlineStatus className="text-subtle">offline · showing cached data</InlineStatus>
      )}
      {label ? (
        <span className="hidden font-mono text-[11px] text-soft md:inline">{label}</span>
      ) : null}
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-ink">
        {initialsFor(session.user?.name, label)}
      </span>
      <a
        href="/auth/logout"
        className="font-mono text-[11px] text-subtle transition-colors hover:text-ink">
        Sign out
      </a>
    </div>
  );
}

export function ConsoleHeaderBar({ orgSwitcher }: { orgSwitcher?: React.ReactNode }) {
  return <ConsoleHeader orgSwitcher={orgSwitcher} identity={<ConsoleIdentity />} />;
}
