'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { CommandPaletteTrigger } from '@lightbridge/ui-web/src/components/command-palette';
import { ThemeToggle } from '@lightbridge/ui-web/src/components/theme-toggle';
import type { NavGroup } from '@lightbridge/ui-web/src/components/nav-spine';
import { ConsoleSidebar } from '@lightbridge/ui-web/src/sections/console-sidebar';
import { ConsoleTopBar } from '@lightbridge/ui-web/src/components/console-top-bar';
import {
  AdminIcon,
  OverviewIcon,
  ProjectsIcon,
  RunsIcon,
  SettingsIcon,
} from '@lightbridge/ui-web/src/lib/icons';
import {
  RAIL_ICON_COLUMN_CLASS,
  RAIL_ICON_SIZE,
  RAIL_ICON_STROKE_WIDTH,
} from '@lightbridge/ui-web/src/lib/rail-grid';
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
        {
          key: 'overview',
          label: 'Overview',
          href: '/',
          icon: <OverviewIcon />,
          active: pathname === '/',
        },
        {
          key: 'repositories',
          label: 'Repositories',
          href: '/repositories',
          icon: <ProjectsIcon />,
          active: pathname.startsWith('/repositories'),
        },
        {
          key: 'runs',
          label: 'Runs',
          href: '/runs',
          icon: <RunsIcon />,
          active: pathname.startsWith('/runs'),
        },
        {
          key: 'admin',
          label: 'Approvals',
          href: '/admin',
          icon: <AdminIcon />,
          active: pathname.startsWith('/admin'),
        },
        {
          key: 'settings',
          label: 'Settings',
          href: '/settings',
          icon: <SettingsIcon />,
          active: pathname.startsWith('/settings'),
        },
      ],
    },
  ];
}

/**
 * The brand mark — no visible text beside it; the product name is carried in `aria-label`
 * instead. Runtime white-label logo, the same mechanism `apps/console`'s own `BrandMark` uses
 * (issue #368, Phase H): `hasLogo`/`hasLogoLight` (from `LCI_BRANDING_LOGO_PATH`/
 * `LCI_BRANDING_LOGO_LIGHT_PATH`, read server-side in `app/(lci)/layout.tsx`) swap the built-in
 * mark for the operator's own file (`GET /branding/logo`/`GET /branding/logo-light`), never a
 * build-time asset. `brand-mark-dark`/`brand-mark-light` pick the right configured image per
 * theme in pure CSS, so it resolves correctly on first paint with no client-side theme read and
 * no flash — the same reasoning `theme.css`'s own `[data-theme]`-redeclared colour tokens rely on.
 */
function LciBrandMark({ hasLogo, hasLogoLight }: { hasLogo: boolean; hasLogoLight: boolean }) {
  const bothConfigured = hasLogo && hasLogoLight;
  return (
    <Link href="/" aria-label="adorsys Code Intelligence — go to home" className="header-brand">
      {hasLogo ? (
        bothConfigured ? (
          <>
            <img
              src="/branding/logo"
              alt=""
              aria-hidden="true"
              className="header-logo brand-mark-dark"
            />
            <img
              src="/branding/logo-light"
              alt=""
              aria-hidden="true"
              className="header-logo brand-mark-light"
            />
          </>
        ) : (
          <img src="/branding/logo" alt="" aria-hidden="true" className="header-logo" />
        )
      ) : (
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
      )}
    </Link>
  );
}

export function LciSidebarContent({
  userLabel,
  onOpenPalette,
  hasLogo,
  hasLogoLight,
}: {
  userLabel: string;
  onOpenPalette: () => void;
  hasLogo: boolean;
  hasLogoLight: boolean;
}) {
  const pathname = usePathname();
  const { preference, setPreference } = useTheme();

  return (
    <ConsoleSidebar
      brand={<LciBrandMark hasLogo={hasLogo} hasLogoLight={hasLogoLight} />}
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
              render={
                // Base UI `render` takes a template that is cloned WITH this Button's children —
                // see `packages/ui-web/src/components/button/component.tsx`'s note on these rules.
                // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
                <a href="/api/auth/logout" />
              }
              nativeButton={false}>
              Sign out
            </Button>
          </div>
        </>
      }
    />
  );
}

export function LciTopBarContent({
  onOpenPalette,
  hasLogo,
  hasLogoLight,
}: {
  onOpenPalette: () => void;
  hasLogo: boolean;
  hasLogoLight: boolean;
}) {
  const { preference, setPreference } = useTheme();
  return (
    <ConsoleTopBar
      brand={<LciBrandMark hasLogo={hasLogo} hasLogoLight={hasLogoLight} />}
      workspaceSwitcher={
        <span className="text-subtle font-sans text-[13px]">Code Intelligence</span>
      }
      paletteTrigger={<CommandPaletteTrigger onClick={onOpenPalette} />}
      trailing={<ThemeToggle preference={preference} onPreferenceChange={setPreference} />}
    />
  );
}
