'use client';

import type { NavGroup } from '@lightbridge/ui-web';
import { AccountBadge, shortAccountId } from '@lightbridge/ui-web/src/components/account-badge';
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
import { ConsoleSidebar } from '@lightbridge/ui-web/src/sections/console-sidebar';
import {
  AdminIcon,
  KeysIcon,
  OverviewIcon,
  ProjectsIcon,
  SearchIcon,
  SettingsIcon,
} from '@lightbridge/ui-web/src/lib/icons';
import {
  RAIL_ICON_COLUMN_CLASS,
  RAIL_ICON_SIZE,
  RAIL_ICON_STROKE_WIDTH,
} from '@lightbridge/ui-web/src/lib/rail-grid';
import { useCommandPaletteShortcut } from '@lightbridge/ui-web/src/lib/use-command-palette-shortcut';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { useAdminScreen } from '../containers/use-admin-screen';
import { useOpenCreateAccountDialog } from '../containers/use-create-account-dialog';
import { writeLastAccountId } from '../containers/use-account-resolver';
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
 * `ConsoleSidebar`, `ConsoleTopBar`, `NavGroup`, `AccountBadge`, `AccountMenu` and
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

export type ConsoleRoute = 'overview' | 'api-keys' | 'projects' | 'settings' | 'admin';

/**
 * The three account-scoped destinations' hrefs, built off whichever account id is currently in
 * play — `/accounts/[accountId]/*` (IA v3 phase 1, "account into the path"). `settings`/`admin`
 * carry no account segment this phase (`middleware.test.ts`'s redirect table, `app/(console)/
 * admin/page.tsx` — Phase 2 moves them).
 *
 * An empty `accountId` (accounts not loaded yet, or genuinely none) routes through `/` — the
 * account resolver — rather than minting a broken `/accounts//overview` URL: `?next=` carries the
 * intended destination through the resolution hop for `api-keys`/`projects` (`overview` needs no
 * `?next=` — it is the resolver's own default). This is what keeps the nav "never dead" even on
 * `/` itself or on `/settings/*`, where there is no path segment to read an account id from at
 * all (`use-console-scope.ts`'s own last-account/first-account fallback is what fills `accountId`
 * in that case).
 */
export function navHrefs(accountId: string): Record<ConsoleRoute, string> {
  if (!accountId) {
    return {
      overview: '/',
      'api-keys': '/?next=api-keys',
      projects: '/?next=projects',
      settings: '/settings',
      admin: '/admin',
    };
  }
  return {
    overview: `/accounts/${accountId}/overview`,
    'api-keys': `/accounts/${accountId}/api-keys`,
    projects: `/accounts/${accountId}/projects`,
    settings: '/settings',
    admin: '/admin',
  };
}

/**
 * Nav active state comes from the pathname, not from a per-route prop — the shell no longer
 * re-mounts per route, so nothing is left to hand it a route name at mount time.
 *
 * Matches `/accounts/<id>/<segment>` for the three account-scoped destinations (IA v3 phase 1);
 * `/settings/*`/`/admin` keep their plain prefix match, and anything else (including `/`, the
 * account resolver) reads as `overview` — the same default the old bare `/` match gave it.
 */
export function routeFromPathname(pathname: string): ConsoleRoute {
  const accountScopedSegment = pathname.match(/^\/accounts\/[^/]+\/([^/]+)/)?.[1];
  if (accountScopedSegment === 'api-keys') return 'api-keys';
  if (accountScopedSegment === 'projects') return 'projects';
  if (accountScopedSegment === 'overview') return 'overview';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'overview';
}

/** One shared icon per nav destination — `lib/icons.tsx`'s coherent set (phase 9), all drawn in
 *  the same 16px box at the same 1.5 stroke, replacing the ad hoc 10x10/stroke-1 glyphs this used
 *  to draw inline (the "odd glyphs" the owner's review flagged). */
const NAV_ICON: Record<'overview' | 'keys' | 'projects' | 'settings' | 'admin', React.ReactNode> = {
  overview: <OverviewIcon />,
  keys: <KeysIcon />,
  projects: <ProjectsIcon />,
  settings: <SettingsIcon />,
  admin: <AdminIcon />,
};

/**
 * The four fixed destinations plus the role-gated Operator group — shell brief (2026-08-30)
 * "Nav groups". There is no more `adminItems`/`showAdmin`/`roleLabel` axis: a gated group is
 * simply included or omitted from the array, and its own label row IS the role marker.
 *
 * `/admin` reads "Refill requests", not "Admin" (shell revamp phase 4, 2026-08-30): the route's
 * own dashboard section moved to `/` itself (gated by `session.isAdmin`), so `/admin` is now
 * exactly one screen — the budget refill review queue — and the nav item is named after what it
 * actually opens. `refillCount` is the same pending-queue query `use-overview-screen.ts`'s
 * "Refill requests" card and `/admin` itself read (`useAdminScreen`, shared by query key) — a
 * plain trailing numeral, never a badge, and omitted (`undefined`) rather than shown as `0` while
 * it is unresolved or genuinely empty.
 */
export function navGroups(
  active: ConsoleRoute,
  isAdmin: boolean,
  accountId: string,
  refillCount?: number
): NavGroup[] {
  const hrefs = navHrefs(accountId);
  const groups: NavGroup[] = [
    {
      key: 'workspace',
      label: 'Workspace',
      items: [
        {
          key: 'overview',
          label: 'Overview',
          href: hrefs.overview,
          icon: NAV_ICON.overview,
          active: active === 'overview',
        },
        {
          key: 'projects',
          label: 'Projects',
          href: hrefs.projects,
          icon: NAV_ICON.projects,
          active: active === 'projects',
        },
        {
          key: 'api-keys',
          label: 'API keys',
          href: hrefs['api-keys'],
          icon: NAV_ICON.keys,
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
          href: hrefs.settings,
          icon: NAV_ICON.settings,
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
          label: 'Refill requests',
          href: hrefs.admin,
          icon: NAV_ICON.admin,
          active: active === 'admin',
          count: refillCount && refillCount > 0 ? refillCount : undefined,
        },
      ],
    });
  }
  return groups;
}

/**
 * The one deterministic rule for every initials chip in the chrome (the sidebar workspace
 * switcher's `avatar-chip` and `AccountMenu`'s identity avatar): a real name or email yields a
 * two-letter monogram; with neither, fall back to the account's own short label
 * (`shortAccountId` — `acct_<first8>`) rather than a placeholder glyph. Both chips used to render
 * `'··'` for an unnamed account with no email on file (live findings #7, 2026-08-30) — a glyph
 * that carries no information and reads as a rendering bug, not a real fallback.
 *
 * `fallbackId` is always an account id — the workspace switcher's `accountId` for the scoped
 * account, and the signed-in person's own `sub` for the identity avatar, since a person's
 * defining identity IS their `accountId` here (ADR-0006).
 */
export function initialsFor(
  name: string | undefined,
  email: string | undefined,
  fallbackId: string
): string {
  const source = name ?? email ?? '';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length > 0) return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  return shortAccountId(fallbackId).charAt(0) || '—';
}

// The brand mark shares `lib/icons.tsx`'s box/stroke contract (phase 9, Addition B — "every icon
// in the sidebar renders in the SAME 16px box with the same stroke width"), even though it lives
// outside that module: it is the one glyph in the chrome that is not a navigable destination.
const BRAND = (
  <>
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
    <span className="header-wordmark">Lightbridge</span>
  </>
);

/**
 * The workspace switcher's data — shared by the sidebar's full-width row and the top bar's
 * compact one, since both are the SAME `AccountBadge` behaviour at two variants. Reads
 * `allAccounts` (raw rows), NOT `accounts` (flattened to `{id, label}` by `accountScopeLabel`,
 * which renders an unnamed account as its short `acct_<first8>` token). Feeding that label to
 * `AccountBadge` as `name` would defeat the badge's own fallback and, for a real name that happens
 * to contain the id, print the account twice — the badge owns its own fallback; it needs the real
 * `name`, or nothing.
 */
function useWorkspaceSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const consoleScope = useConsoleScope();
  const openCreateAccount = useOpenCreateAccountDialog();
  const activeAccount = consoleScope.allAccounts.find(
    (account) => account.id === consoleScope.value.accountId
  );

  return {
    accountId: consoleScope.value.accountId,
    name: activeAccount?.name,
    initials: initialsFor(
      activeAccount?.name ?? undefined,
      undefined,
      consoleScope.value.accountId
    ),
    accounts: consoleScope.allAccounts.map((account) => ({ id: account.id, label: account.name })),
    // Account is a path segment now (IA v3 phase 1) -- switching it is real navigation, to the
    // SAME screen under the new account, not a param write `use-console-scope.ts`'s `setValue`
    // no longer supports. `routeFromPathname` + `navHrefs` are the same pair `ConsolePaletteDialog`
    // and `ConsoleSidebarContent` build their own hrefs from, so all three agree on what "the same
    // screen" means without knowing about each other.
    onSelectAccount: (accountId: string) => {
      writeLastAccountId(accountId);
      router.push(navHrefs(accountId)[routeFromPathname(pathname)]);
    },
    onCopyId: (accountId: string) => {
      // Best-effort: `navigator.clipboard` is undefined on insecure origins. A failed copy
      // leaves the id in the tooltip, so there is nothing to recover.
      void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
    },
    // ADR-0026 (lightbridge-authz#564): one identity may own several accounts now, so the
    // switcher always offers a way to add another — see `AccountBadge`'s own doc comment for why
    // this alone is enough to make it a real dropdown even with a single account today.
    onCreateAccount: openCreateAccount,
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
  // Same accountId resolution the sidebar's own hrefs use (`useWorkspaceSwitcher`) — path first,
  // then the last-account/first-account fallback (`use-console-scope.ts`) — so the palette's
  // "Navigate" items always land on a real account, even when the palette is opened from `/` or
  // `/settings/*`.
  const scope = useConsoleScope();
  const hrefs = navHrefs(scope.value.accountId);
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
      { key: 'overview', label: 'Overview', onSelect: () => router.push(hrefs.overview) },
      { key: 'api-keys', label: 'API keys', onSelect: () => router.push(hrefs['api-keys']) },
      { key: 'projects', label: 'Projects', onSelect: () => router.push(hrefs.projects) },
      { key: 'settings', label: 'Settings', onSelect: () => router.push(hrefs.settings) },
    ];
    if (session.isAdmin) {
      navigate.push({
        key: 'admin',
        label: 'Refill requests',
        hint: 'ROLE',
        onSelect: () => router.push(hrefs.admin),
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
  }, [router, session.isAdmin, hrefs]);

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
/**
 * The Operator nav row's trailing count — the same pending-refill query `/admin` and `/`'s
 * "Refill requests" card read, shared by query key (`use-admin-screen.ts`'s own doc comment),
 * fired only for an admin ("fire NO extra query for non-admins" — shell revamp phase 4 brief).
 *
 * `undefined` while the query hasn't resolved (or for a non-admin) rather than `0`: the row must
 * "not block nav rendering on it — show nothing while loading" (shell brief), and a `0` shown
 * before the real count is known would be a fabricated figure, not an honest one.
 */
function useOperatorRefillCount(isAdmin: boolean): number | undefined {
  const queue = useAdminScreen(isAdmin);
  if (!isAdmin || queue.loading) return undefined;
  return queue.pendingCount;
}

export function ConsoleSidebarContent({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const { preference, setPreference } = useConsoleTheme();
  const switcher = useWorkspaceSwitcher();
  const route = routeFromPathname(pathname);
  // Fall back to the subject's short account label when the IdP returns no identity claims at
  // all (observed live 2026-08-30: the brokered CDigital login carries neither name, nor
  // preferred_username, nor email in the token or /userinfo — a Keycloak mapper gap, tracked
  // outside this repo). A naked avatar chip with no text reads as a rendering bug.
  const identityLabel =
    session.user?.email ??
    session.user?.preferredUsername ??
    session.user?.name ??
    (session.user ? shortAccountId(session.user.sub) : undefined);
  const refillCount = useOperatorRefillCount(session.isAdmin);

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
          onCreateAccount={switcher.onCreateAccount}
        />
      }
      groups={navGroups(route, session.isAdmin, switcher.accountId, refillCount)}
      linkComponent={Link}
      footer={
        <>
          {/* Icon column + label at the shared rail label-x (Addition B/the sidebar grid fix) —
              a magnifier fills the column `NavRow`'s glyph would, so this row's label lines up
              with every nav row's above it instead of starting flush at the row's own padding. */}
          <button type="button" onClick={onOpenPalette} className="sidebar-footer-row">
            <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
              <SearchIcon />
            </span>
            <span className="text-subtle font-sans text-[13px]">Search</span>
            <kbd className="kbd kbd-sm ml-auto">⌘K</kbd>
          </button>
          {/* Standalone Theme row DELETED (Addition 5 dedupe, owner review): the theme
              control already lives inside `AccountMenu`'s own popup below (`theme`/
              `onThemeChange`, passed through unchanged) — a second, separate Theme row in the
              footer duplicated the same control. `preference`/`setPreference` stay in scope only
              to feed that one AccountMenu prop pair now. */}
          {online ? null : (
            <div className="sidebar-footer-row">
              {/* Empty icon-column spacer (rail-grid.ts rule 3) — an iconless row still reserves
                  the same 16px column every other footer/nav row's glyph sits in, so its text
                  starts at the one shared label x rather than flush at the row's own padding. */}
              <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
              <InlineStatus className="text-subtle">offline · showing cached data</InlineStatus>
            </div>
          )}
          {/* No wrapping `sidebar-footer-row` here — the identity row's own hover/hit-target IS
              the menu trigger (`variant="sidebar"` renders that class on the trigger itself), so
              wrapping it a second time would nest two hover surfaces. */}
          <AccountMenu
            variant="sidebar"
            name={session.user?.name}
            email={identityLabel}
            initials={initialsFor(session.user?.name, identityLabel, session.user?.sub ?? '')}
            onSignOut={signOut}
            theme={preference}
            onThemeChange={setPreference}
          />
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
  // Fall back to the subject's short account label when the IdP returns no identity claims at
  // all (observed live 2026-08-30: the brokered CDigital login carries neither name, nor
  // preferred_username, nor email in the token or /userinfo — a Keycloak mapper gap, tracked
  // outside this repo). A naked avatar chip with no text reads as a rendering bug.
  const identityLabel =
    session.user?.email ??
    session.user?.preferredUsername ??
    session.user?.name ??
    (session.user ? shortAccountId(session.user.sub) : undefined);

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
          onCreateAccount={switcher.onCreateAccount}
        />
      }
      paletteTrigger={<CommandPaletteTrigger onClick={onOpenPalette} />}
      identity={
        <AccountMenu
          name={session.user?.name}
          email={identityLabel}
          initials={initialsFor(session.user?.name, identityLabel, session.user?.sub ?? '')}
          onSignOut={signOut}
          theme={preference}
          onThemeChange={setPreference}
        />
      }
    />
  );
}
