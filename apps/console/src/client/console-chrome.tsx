'use client';

import type { NavGroup } from '@lightbridge/ui-web';
import { AccountBadge, shortAccountId } from '@lightbridge/ui-web/src/components/account-badge';
import { Button } from '@lightbridge/ui-web/src/components/button';
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
import {
  AccountsIcon,
  AdminIcon,
  BackIcon,
  InfoIcon,
  KeysIcon,
  OverviewIcon,
  PoliciesIcon,
  RefillOptionsIcon,
  RolesIcon,
  SearchIcon,
  SettingsIcon,
  SignOutIcon,
  TiersIcon,
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

import { useRefillsQueueScreen } from '../containers/use-refills-queue-screen';
import { useOpenCreateAccountDialog } from '../containers/use-create-account-dialog';
import { writeLastAccountId } from '../containers/use-account-resolver';
import { accountScopeLabel } from '../containers/account-label';
import { useConsoleBrandingLogo } from './branding-context';
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
 * `ConsoleSidebar`, `ConsoleTopBar`, `NavGroup`, `AccountBadge`, `Button`/`SignOutIcon` (the
 * left rail's own identity row) and `InlineStatus`, and supplies the app-specific data (routes,
 * identity, connectivity).
 *
 * Subpath imports (`@lightbridge/ui-web/src/components/*`) rather than the package barrel are
 * deliberate: a barrel import here would pull `index.ts`'s entire re-export graph — including the
 * `d3-scale`/`d3-shape`/`d3-array`-backed chart components only the Overview route renders — into
 * the shared layout chunk every route loads. Next's dev webpack build doesn't tree-shake unused
 * re-exports (that's a production-only optimization), so this is a real, measured cost. Type-only
 * imports (`NavGroup`) stay on the barrel — they erase at compile time, so which module
 * re-exports them costs nothing.
 */

export type ConsoleRoute = 'overview' | 'api-keys' | 'settings' | 'admin';

/**
 * The chrome's THREE nav surfaces (IA v3 phase 2 — "the settings area"; ADR 0013's same-day "the
 * admin area" amendment adds the third): `account` is the Workspace/Account nav `navGroups` below
 * builds (its former third group, Operator, is deleted outright — owner review round 2,
 * 2026-08-31, converse-frontends#368 finding #1, `navGroups`' own doc comment); `settings` is
 * `/settings/*`'s OWN nav (`settingsNavGroups`); `admin`
 * is `/admin/*`'s own nav (`adminNavGroups`). Each REPLACES the others in the same sidebar mount
 * — never a second nav surface, never a remount of `ConsoleShell` itself (that stays
 * `app/(console)/layout.tsx`'s job, unchanged by either phase). `ConsoleSidebarContent`/
 * `ConsoleTopBarContent` are what branch on this; the account-scoped screens never need to know
 * it exists.
 */
export type ConsoleArea = 'account' | 'settings' | 'admin';

/** Which of the three nav surfaces a pathname belongs to — the one predicate every chrome branch
 *  (sidebar, top bar, mobile dock) shares, so "what counts as inside settings/admin" is stated
 *  once. `/admin` is checked before `/settings` only because the two prefixes are disjoint, not
 *  because order matters here. */
export function areaFromPathname(pathname: string): ConsoleArea {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'account';
}

/**
 * The two account-scoped destinations' hrefs, built off whichever account id is currently in
 * play — `/accounts/[accountId]/*` (IA v3 phase 1, "account into the path"). `settings`/`admin`
 * carry no account segment at all — the settings area (IA v3 phase 2, which `admin` now belongs
 * to as well) is never account-scoped by path (`middleware.test.ts`'s redirect table).
 *
 * **IA v3 phase E ("the settings/accounts move") drops `projects`/`refill` from this table.**
 * `/accounts/[accountId]/*` now owns exactly `overview`/`api-keys` — the projects ledger and the
 * refill request flow both moved to `/settings/accounts/<id>/{projects,request-refill}`, reached
 * from the settings area's own "Accounts" nav entry, not from this account-area table. A stale
 * link to either old path still works (`middleware.ts`'s 308 table), it just no longer has a nav
 * row or a palette entry pointing at it directly.
 *
 * An empty `accountId` (accounts not loaded yet, or genuinely none) routes through `/` — the
 * account resolver — rather than minting a broken `/accounts//overview` URL: `?next=` carries the
 * intended destination through the resolution hop for `api-keys` (`overview` needs no `?next=` —
 * it is the resolver's own default). This is what keeps the nav "never dead" even on `/` itself or
 * on `/settings/*`, where there is no path segment to read an account id from at all
 * (`use-console-scope.ts`'s own last-account/first-account fallback is what fills `accountId` in
 * that case).
 *
 * `admin` (ADR 0013's same-day "the admin area" amendment) now names `/admin/overview` — the
 * operator dashboard, the admin area's own landing destination — not the budget refill review
 * queue directly. The queue moved a second time alongside it, to `/admin/refills-queue`, reached
 * one click further in (dashboard 5's own "Queue depth" stat, or the admin area's own "Refills
 * queue" nav row) rather than through this field. Every existing caller of this field — the
 * settings area's own gated "Admin" row (`settingsNavGroups`), the command palette's "Admin
 * overview" item — follows the new target without needing its own change. (The account-area rail
 * used to carry a third caller, an Operator nav row pointed at this same href — owner review
 * round 2, 2026-08-31, converse-frontends#368 finding #1, deleted it outright rather than
 * updating it; see `navGroups`' own doc comment.)
 */
export function navHrefs(accountId: string): Record<ConsoleRoute, string> {
  if (!accountId) {
    return {
      overview: '/',
      'api-keys': '/?next=api-keys',
      settings: '/settings',
      admin: '/admin/overview',
    };
  }
  return {
    overview: `/accounts/${accountId}/overview`,
    'api-keys': `/accounts/${accountId}/api-keys`,
    settings: '/settings',
    admin: '/admin/overview',
  };
}

/**
 * Nav active state comes from the pathname, not from a per-route prop — the shell no longer
 * re-mounts per route, so nothing is left to hand it a route name at mount time.
 *
 * Matches `/accounts/<id>/<segment>` for the two account-scoped destinations left (IA v3 phase 1,
 * narrowed by phase E — `projects` moved to `/settings/accounts/<id>/projects`, which already
 * matches the `/settings` prefix clause below); `/admin/*` and `/settings/*` each keep their own
 * plain prefix match; anything else (including `/`, the account resolver) reads as `overview` —
 * the same default the old bare `/` match gave it.
 *
 * ADR 0013's same-day "the admin area" amendment makes `admin` a live match again — `/admin/*`
 * genuinely exists now (`/admin/overview`, `/admin/refills-queue`), unlike the interval between
 * IA v3 phase 2 (which folded the old `/admin` into `/settings/refills-queue`) and this amendment,
 * when the value stayed in `ConsoleRoute` only so `navGroups`' Operator row had a name to compare
 * its own `active` flag against.
 */
export function routeFromPathname(pathname: string): ConsoleRoute {
  const accountScopedSegment = pathname.match(/^\/accounts\/[^/]+\/([^/]+)/)?.[1];
  if (accountScopedSegment === 'api-keys') return 'api-keys';
  if (accountScopedSegment === 'overview') return 'overview';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'overview';
}

/** One shared icon per nav destination — `lib/icons.tsx`'s coherent set (phase 9), all drawn in
 *  the same 16px box at the same 1.5 stroke, replacing the ad hoc 10x10/stroke-1 glyphs this used
 *  to draw inline (the "odd glyphs" the owner's review flagged). No `admin` entry any more (owner
 *  review round 2, 2026-08-31, converse-frontends#368 finding #1 — see `navGroups`' own doc
 *  comment for why the Operator row is gone from this set entirely). */
const NAV_ICON: Record<'overview' | 'keys' | 'settings', React.ReactNode> = {
  overview: <OverviewIcon />,
  keys: <KeysIcon />,
  settings: <SettingsIcon />,
};

/**
 * The account area's two fixed groups — shell brief (2026-08-30) "Nav groups". There is no more
 * `adminItems`/`showAdmin`/`roleLabel` axis: a gated group is simply included or omitted from the
 * array, and its own label row IS the role marker.
 *
 * **IA v3 phase E ("the settings/accounts move") narrows Workspace to Overview/API keys.** The
 * Projects row (and the unrouted refill destination) both moved to
 * `/settings/accounts/<id>/{projects,request-refill}`, reached through the settings area's own
 * "Accounts" nav entry — `/accounts/[accountId]/*` itself now owns exactly `overview`/`api-keys`,
 * and this group is honest about that rather than keeping a row for a segment the account area no
 * longer serves.
 *
 * **The Operator group is GONE (owner review round 2, 2026-08-31, converse-frontends#368 finding
 * #1, verbatim): "Which button leads to the admin pages? Oh wait, it's the button 'Refill queue'
 * that leads to 'admin'? Please remove that. Instead, inside of the settings, place a permission
 * gated button 'Admin' that leads to admin."** The row used to read "Refill requests" and land on
 * `/admin/overview` — a console-rail entry point into the admin area the owner does not want here
 * at all, not even relabelled. There is no replacement row in this function: the ONE way an admin
 * reaches `/admin` from the chrome now is `settingsNavGroups`' own gated "Admin" row, one level in
 * (Account -> Settings -> Admin), never a shortcut straight off the account-area rail. This
 * function therefore takes no `isAdmin`/`refillCount` params any more — nothing here reads a role
 * or a count. The pending-refill figure stays honestly visible for admins regardless: the admin
 * area's own "Refills queue" nav row (`adminNavGroups`, below) already carries it.
 */
export function navGroups(active: ConsoleRoute, accountId: string): NavGroup[] {
  const hrefs = navHrefs(accountId);
  return [
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
}

// ── `/settings/*` — the settings area's own nav (IA v3 phase 2) ────────────────────────────────

/**
 * The settings area's six destinations, in the owner-dictated nav order. `accounts` was new in
 * IA v3 phase E ("the settings/accounts move" — owner: "add /settings/accounts... And
 * /settings/accounts/<account-id> would be for account related settings"), placed right after
 * `overview` per that directive. **`refills-queue` moved OUT** (ADR 0013's same-day "the admin
 * area" amendment) — the budget refill review queue lives at `/admin/refills-queue` now, alongside
 * the operator dashboard, not in this flat settings list. **`refill-options` moved OUT too**
 * (owner ruling, verbatim: "Refill options are for admins only. Not normal users." —
 * converse-frontends#368) — it is `/admin/refill-policies` now, alongside the other two admin-only
 * destinations, not a row every settings visitor sees. Five of the six are live routes
 * (`overview`, `accounts`, `tiers`, `policies`, `info`); `roles` alone stays a real, permanent row
 * that renders `disabled` rather than being omitted — omitting it would hide that the destination
 * exists at all, and a disabled row with a stated reason is the honest middle ground between "not
 * built" and "silently missing" (console-ui skill's "never fabricate" clause extends to
 * navigation: a row that LOOKS live but 404s is its own kind of fabrication).
 */
export type SettingsRoute = 'overview' | 'accounts' | 'roles' | 'tiers' | 'policies' | 'info';

/**
 * `/settings/<segment>` -> which nav row is active. Every LIVE segment gets its own prefix match;
 * `roles` alone has no route to match (it is the one remaining disabled, `href`-less row — see
 * `settingsNavGroups`) and so never appears here. The bare `/settings` segment (mid-redirect to
 * `/settings/overview/usage`, `app/(console)/settings/page.tsx`) and anything unrecognised default
 * to `overview`, the same "unmatched reads as the first destination" contract
 * `routeFromPathname` uses for `/`. `accounts` matches the WHOLE
 * `/settings/accounts/<id>/{projects,request-refill}` subtree too, not only the bare list — all
 * three screens are the one "Accounts" nav destination's own drill-down, the same way every
 * `/accounts/<id>/<segment>` screen answers to one `routeFromPathname` match.
 */
export function settingsRouteFromPathname(pathname: string): SettingsRoute {
  if (pathname.startsWith('/settings/accounts')) return 'accounts';
  if (pathname.startsWith('/settings/tiers')) return 'tiers';
  if (pathname.startsWith('/settings/policies')) return 'policies';
  if (pathname.startsWith('/settings/info')) return 'info';
  return 'overview';
}

/** One shared icon per settings destination, the same 16px/1.5-stroke family `NAV_ICON` draws
 *  from (`lib/icons.tsx`) — never a second, differently-weighted glyph set for the second area.
 *  `admin` (owner review round 2, 2026-08-31, finding #1) reuses the exact glyph `adminNavGroups`'
 *  own "Refills queue" row used to draw here before it moved out — the shield names a CONCEPT
 *  (operator authority), not the area a given row happens to render in. */
const SETTINGS_NAV_ICON: Record<SettingsRoute | 'admin', React.ReactNode> = {
  overview: <OverviewIcon />,
  accounts: <AccountsIcon />,
  roles: <RolesIcon />,
  tiers: <TiersIcon />,
  policies: <PoliciesIcon />,
  info: <InfoIcon />,
  admin: <AdminIcon />,
};

/** The honest reason `/settings/roles` renders disabled — no `lightbridge-authz` read API exists
 *  for role/permission mappings today, so a real screen would have nothing to fetch. Filed as
 *  lightbridge-authz#571 (converse-frontends#368's IA v3 phase 2 ticket is the source of truth
 *  for the phase itself). */
export const ROLES_DISABLED_REASON =
  'Role and permission mapping is operator config today; no read API exists (lightbridge-authz#571).';

/**
 * The settings area's nav — REPLACES `navGroups`' Workspace/Account groups in the same sidebar
 * mount when `areaFromPathname(pathname) === 'settings'` (`ConsoleSidebarContent`), never a
 * second nav surface alongside it. One ungrouped list (no group `label`s) — the destination count
 * is not enough to need a section heading the way the account area's two groups do, and the
 * owner's own nav order names it as a flat sequence, not grouped families.
 *
 * **`isAdmin` is back (owner review round 2, 2026-08-31, converse-frontends#368 finding #1,
 * verbatim): "Instead, inside of the settings, place a permission gated button 'Admin' that leads
 * to admin."** This is now the ONLY way the console chrome reaches `/admin` from outside the admin
 * area itself — `navGroups`' own Operator row (which used to shortcut straight there from the
 * account-area rail) is deleted outright, not relabelled (see that function's own doc comment).
 * The row is appended LAST, after every real settings destination: it is an exit door into a
 * different area, the same relationship `BackToConsoleRow` has to the account area, not a settings
 * destination of its own — it never carries `active` (there is no settings pathname it corresponds
 * to; once the visitor is actually on `/admin/*`, `ConsoleSidebarContent` has already swapped to
 * `adminNavGroups` instead, so this row is never rendered alongside its own destination). Omitted
 * outright for a non-admin, matching the included-or-omitted contract every other gated row/group
 * in this file already follows — never a disabled row with a role-gate reason the way `roles`
 * (unbuilt, not unauthorized) uses one. No trailing count here: the pending-refill figure already
 * has an honest home in `adminNavGroups`' own "Refills queue" row, one click further in.
 */
export function settingsNavGroups(active: SettingsRoute, isAdmin: boolean): NavGroup[] {
  const items: NavGroup['items'] = [
    {
      key: 'overview',
      label: 'Overview',
      href: '/settings/overview',
      icon: SETTINGS_NAV_ICON.overview,
      active: active === 'overview',
    },
    {
      key: 'accounts',
      label: 'Accounts',
      href: '/settings/accounts',
      icon: SETTINGS_NAV_ICON.accounts,
      active: active === 'accounts',
    },
    {
      key: 'roles',
      label: 'Roles',
      icon: SETTINGS_NAV_ICON.roles,
      disabled: true,
      reason: ROLES_DISABLED_REASON,
    },
    {
      key: 'tiers',
      label: 'Tier configs',
      href: '/settings/tiers',
      icon: SETTINGS_NAV_ICON.tiers,
      active: active === 'tiers',
    },
    {
      key: 'policies',
      label: 'Project policies',
      href: '/settings/policies',
      icon: SETTINGS_NAV_ICON.policies,
      active: active === 'policies',
    },
    {
      key: 'info',
      label: 'Info',
      href: '/settings/info',
      icon: SETTINGS_NAV_ICON.info,
      active: active === 'info',
    },
  ];
  if (isAdmin) {
    items.push({
      key: 'admin',
      label: 'Admin',
      href: '/admin/overview',
      icon: SETTINGS_NAV_ICON.admin,
    });
  }
  return [{ key: 'settings', items }];
}

// ── `/admin/*` — the admin area's own nav (ADR 0013's same-day "the admin area" amendment) ─────

/**
 * The admin area's three destinations, in the same "dashboard first, drill-down after" order the
 * settings area's own gated "Admin" row (`settingsNavGroups`) links into: `/admin/overview` (the
 * eight-board operator dashboard), `/admin/refills-queue` (the budget refill review queue, moved
 * here from
 * `/settings/refills-queue`), then `/admin/refill-policies` (the policy authoring/simulation
 * surface, moved here from `/settings/refill-options` — owner ruling, verbatim: "Refill options
 * are for admins only. Not normal users.", converse-frontends#368). All three are real for every
 * visitor who reaches this nav at all — the whole area is gated server-side
 * (`admin/overview/page.tsx`, `admin/refills-queue/page.tsx`, `admin/refill-policies/page.tsx`)
 * and `ConsoleSidebarContent` never renders `adminNavGroups` for a non-admin (see its own doc
 * comment), so there is no disabled/omitted row to model here the way settings' `roles` needs.
 */
export type AdminRoute = 'overview' | 'refills-queue' | 'refill-policies';

/** `/admin/<segment>` -> which nav row is active. Anything unrecognised (including the bare
 *  `/admin` segment, mid-redirect to `/admin/overview`) defaults to `overview` — the same
 *  "unmatched reads as the first destination" contract `settingsRouteFromPathname`/
 *  `routeFromPathname` use for their own bare segments. */
export function adminRouteFromPathname(pathname: string): AdminRoute {
  if (pathname.startsWith('/admin/refills-queue')) return 'refills-queue';
  if (pathname.startsWith('/admin/refill-policies')) return 'refill-policies';
  return 'overview';
}

/** One shared icon per admin destination, the same 16px/1.5-stroke family `NAV_ICON`/
 *  `SETTINGS_NAV_ICON` draw from (`lib/icons.tsx`) — never a third, differently-weighted glyph
 *  set for the third area. `refill-policies` reuses the exact icon the settings row it replaced
 *  used — the glyph names a CONCEPT (a refill ladder), not the area it lives in. */
const ADMIN_NAV_ICON: Record<AdminRoute, React.ReactNode> = {
  overview: <OverviewIcon />,
  'refills-queue': <AdminIcon />,
  'refill-policies': <RefillOptionsIcon />,
};

/**
 * The admin area's nav — REPLACES `navGroups`'/`settingsNavGroups`' content in the same sidebar
 * mount when `ConsoleSidebarContent` has already confirmed `session.isAdmin` (see that
 * component's own doc comment for why the check lives there, not here): this function itself
 * takes no `isAdmin` param because it is never called for a non-admin at all — there is no
 * disabled-row case to model, unlike `settingsNavGroups`' `roles`. `refillCount` is
 * `useOperatorRefillCount`'s own trailing numeral — the account-area rail used to carry a second
 * caller of the same count (the Operator row `navGroups` deleted, owner review round 2,
 * 2026-08-31, converse-frontends#368 finding #1), but this row is now its ONLY home — never `0`
 * while it's still loading.
 */
export function adminNavGroups(active: AdminRoute, refillCount?: number): NavGroup[] {
  return [
    {
      key: 'admin',
      items: [
        {
          key: 'overview',
          label: 'Overview',
          href: '/admin/overview',
          icon: ADMIN_NAV_ICON.overview,
          active: active === 'overview',
        },
        {
          key: 'refills-queue',
          label: 'Refills queue',
          href: '/admin/refills-queue',
          icon: ADMIN_NAV_ICON['refills-queue'],
          active: active === 'refills-queue',
          count: refillCount && refillCount > 0 ? refillCount : undefined,
        },
        {
          key: 'refill-policies',
          label: 'Refill policies',
          href: '/admin/refill-policies',
          icon: ADMIN_NAV_ICON['refill-policies'],
          active: active === 'refill-policies',
        },
      ],
    },
  ];
}

/**
 * The one deterministic rule for every initials chip in the chrome (the sidebar workspace
 * switcher's `avatar-chip` and the sidebar footer's own identity row `avatar-chip-sm`): a real
 * name or email yields a two-letter monogram; with neither, fall back to the account's own short
 * label
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
// outside that module.
//
// Owner review, 2026-08-31: two findings on this one mark. (1) "When I click on the main logo, I
// should be redirected to the '/'. Current behaviour: not clickable" — it used to render as inert
// spans; now it IS the one navigable destination in the chrome that isn't a `NavGroup` row, so it
// is `next/link`'s `Link` (router-aware, matching every other in-shell link — a plain `<a>` would
// force a full document reload) rather than a `NavRow`. `/` is the last-account resolver (ADR
// 0013 D1), which is exactly the "take me home" behaviour a logo click means. (2) "If there's a
// logo, the name 'Lightbridge' should scram" — the `header-wordmark` span is gone; the accessible
// name that text used to carry now lives on the link itself (`aria-label`), so the mark stays
// nameable to a screen reader with nothing rendered twice.
//
// issue #368 (Phase H, runtime white-label branding): `hasCustomLogo` (from
// `useConsoleBrandingLogo()`, seeded server-side by the root layout — see `branding-context.tsx`'s
// own doc comment for why this is a boolean read once rather than an `<img>` that always attempts
// `/branding/logo` and falls back on a 404) swaps the built-in mark for the operator's own file.
// Both link/`aria-label`/decorative-icon contract stays byte-identical either way. `theme.css`'s
// own `header-logo` utility already anticipates exactly this swap ("identical whether it holds
// the configured image or the fallback mark... the fallback branch is selected structurally
// (`:not(img)`)") — `header-logo` goes directly on the `<img>` for the configured case, and on
// the wrapping `<span>` around the SVG for the fallback, never a second class for the image.
export function BrandMark({ hasCustomLogo }: { hasCustomLogo: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Lightbridge — go to console home"
      className="header-brand focus-ring">
      {hasCustomLogo ? (
        // Plain `<img>`, not `next/image`: a same-origin, operator-mounted runtime file
        // (`GET /branding/logo`), not a build-time asset `next/image` can optimize.
        <img src="/branding/logo" alt="" aria-hidden="true" className="header-logo" />
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
 * Three groups are wired: **Navigate**, **Scope** and **Actions** (in that order — orientation
 * before switching context, actions last). See the git history of this file for the fuller
 * "New key / Generate report / Request refill" candidates this task considered and rejected, each
 * for lacking a wired flow to reuse rather than stub.
 */
export function useConsolePalette() {
  const router = useRouter();
  const pathname = usePathname();
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
      // IA v3 phase E: Projects moved to `/settings/accounts/<id>/projects` — not account-scoped
      // by this table any more (see `navHrefs`'s own doc comment), so the palette entry points at
      // the settings area's own "Accounts" list instead of a per-account projects href.
      { key: 'accounts', label: 'Accounts', onSelect: () => router.push('/settings/accounts') },
      { key: 'settings', label: 'Settings', onSelect: () => router.push(hrefs.settings) },
    ];
    if (session.isAdmin) {
      // ADR 0013's same-day "the admin area" amendment: `hrefs.admin` now names the operator
      // dashboard (`/admin/overview`), not the refills queue directly, so this gets its own
      // entry rather than the queue's own label — the same "one entry per real destination" split
      // the `accounts`/`settings` pair above already uses. `refills-queue` links straight into the
      // queue for a reviewer who wants it without the dashboard first. `refill-policies` is the
      // same shape again, added when the admin-only surface moved off `/settings/refill-options`
      // (owner ruling, converse-frontends#368).
      navigate.push(
        {
          key: 'admin',
          label: 'Admin overview',
          hint: 'ROLE',
          onSelect: () => router.push(hrefs.admin),
        },
        {
          key: 'refills-queue',
          label: 'Refill requests',
          hint: 'ROLE',
          onSelect: () => router.push('/admin/refills-queue'),
        },
        {
          key: 'refill-policies',
          label: 'Refill policies',
          hint: 'ROLE',
          onSelect: () => router.push('/admin/refill-policies'),
        }
      );
    }

    // Scope group (console-ui#310/#302): switching account from the palette re-uses the exact
    // same navigation mechanism `useWorkspaceSwitcher.onSelectAccount` already drives for the
    // sidebar/top-bar workspace switcher — write the last-used account, then push the SAME
    // route segment (`routeFromPathname`/`navHrefs`) under the new account, so picking an
    // account here never bounces the caller back to Overview. The currently active account is
    // excluded rather than rendered as a no-op "switch to where you already are" row.
    const currentRoute = routeFromPathname(pathname);
    const scopeItems: CommandPaletteItem[] = scope.allAccounts
      .filter((account) => account.id !== scope.value.accountId)
      .map((account) => ({
        key: `scope-${account.id}`,
        label: accountScopeLabel(account),
        keywords: [account.id],
        onSelect: () => {
          writeLastAccountId(account.id);
          router.push(navHrefs(account.id)[currentRoute]);
        },
      }));

    // cmdk still renders a Command.Group's heading with nothing beneath it when it has zero
    // items and the query is empty (its own `hidden` toggle only engages once there is search
    // text to filter against) — an empty "Scope" heading with no rows under it is exactly the
    // empty-placeholder pattern the console-ui skill bans for the inspector rail; the palette
    // gets the same treatment, omit the group entirely rather than render it hollow.
    return [
      { key: 'navigate', heading: 'Navigate', items: navigate },
      ...(scopeItems.length > 0 ? [{ key: 'scope', heading: 'Scope', items: scopeItems }] : []),
      {
        key: 'actions',
        heading: 'Actions',
        items: [{ key: 'sign-out', label: 'Sign out', onSelect: signOut }],
      },
    ];
  }, [router, session.isAdmin, hrefs, pathname, scope.allAccounts, scope.value.accountId]);

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
 * The pending-refill trailing count `adminNavGroups`' own "Refills queue" row shows — the same
 * query `/admin/refills-queue` itself reads (shared by query key,
 * `use-refills-queue-screen.ts`'s own doc comment), fired only for an admin ("fire NO extra query
 * for non-admins" — shell revamp phase 4 brief). Owner review round 2 (2026-08-31,
 * converse-frontends#368 finding #1) deleted this figure's OTHER home, the account-area rail's
 * Operator row (`navGroups`' own doc comment) — the admin area's own row is now the only place it
 * renders, which is sufficient: the finding only asked that the count stay honestly visible for
 * admins SOMEWHERE, not that it survive on the rail specifically.
 *
 * `undefined` while the query hasn't resolved (or for a non-admin) rather than `0`: the row must
 * "not block nav rendering on it — show nothing while loading" (shell brief), and a `0` shown
 * before the real count is known would be a fabricated figure, not an honest one.
 */
function useOperatorRefillCount(isAdmin: boolean): number | undefined {
  const queue = useRefillsQueueScreen(isAdmin);
  if (!isAdmin || queue.loading) return undefined;
  return queue.pendingCount;
}

/**
 * The settings/admin areas' own workspace-switcher-slot replacement (IA v3 phase 2; shared
 * verbatim by the admin area since ADR 0013's same-day amendment — both `area === 'settings'` and
 * `showAdminChrome` render this same function, `ConsoleSidebarContent`'s own doc comment). Neither
 * `/settings/*` nor `/admin/*` is account-scoped by path (`use-console-scope.ts`'s own fallback
 * resolves a current account for it anyway, the same last-account/first-account order `/`'s
 * resolver uses), so a workspace switcher there would suggest scoping the area TO an account the
 * way `/accounts/<id>/*` screens are, which it is not. This row is the one way back into the
 * account area instead, always landing on Overview for whichever account `useConsoleScope()`
 * currently resolves to.
 *
 * **Rebuilt on the standard nav-row anatomy (owner review round 2, 2026-08-31,
 * converse-frontends#368 finding #2, verbatim): "'Back to console' is coupled to the arrow left
 * icon. It should have the same distance as the other menu items. I mean, technically it's also a
 * menu item right?"** It used to render the "←" as a literal character glued onto the front of
 * the label TEXT (`← Back to console`) inside a bare `sidebar-footer-row` with only one child —
 * `sidebar-footer-row`'s own `gap` never applied with nothing to gap against, so the label started
 * flush at the row's 12px padding instead of the shared 38px label x (`RAIL_ROW_PADDING_X(12) +
 * RAIL_ICON_COLUMN_WIDTH(16) + RAIL_LABEL_GAP(10)`, `rail-grid.ts`) every nav row below it in
 * `settingsNavGroups`/`adminNavGroups` starts at. Now it is the SAME two-child shape those rows
 * use: `BackIcon` sits in the fixed `RAIL_ICON_COLUMN_CLASS` column (rule 2/3, `rail-grid.ts`),
 * `sidebar-footer-row`'s own `gap: 0.625rem` (= `RAIL_LABEL_GAP`) sits between it and the label,
 * and the row keeps the identical `h-9`/36px height (`sidebar-footer-row`'s `height: 2.25rem` =
 * `RAIL_NAV_ROW_HEIGHT`) — a menu item in every geometric sense now, not just in name.
 * `geometry.test.tsx`'s own cross-check pins this against the real compiled `theme.css`/
 * `rail-grid.ts` numbers rather than eyeballing it, the same "source-pinned, not computed-style"
 * approach `console-sidebar/geometry.test.ts` uses for the same reason (jsdom drops `@layer`).
 */
export function BackToConsoleRow({ accountId }: { accountId: string }) {
  return (
    <Link href={navHrefs(accountId).overview} className="sidebar-footer-row">
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
        <BackIcon />
      </span>
      <span className="text-soft font-sans text-[13px]">Back to console</span>
    </Link>
  );
}

/** `ConsoleTopBar`'s own `workspaceSwitcher` slot is a single inline element in a 48px band
 *  (`ConsoleTopBar`'s doc comment — a pure layout band, no row chrome of its own), so this is the
 *  same swap as `BackToConsoleRow` above without that row's block-level padding. */
function BackToConsoleCompact({ accountId }: { accountId: string }) {
  return (
    <Link
      href={navHrefs(accountId).overview}
      className="text-soft focus-ring font-sans text-[13px]">
      ← Back to console
    </Link>
  );
}

export function ConsoleSidebarContent({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const session = useConsoleSession();
  const hasCustomLogo = useConsoleBrandingLogo();
  const online = useOnlineStatus();
  const { preference, setPreference } = useConsoleTheme();
  const switcher = useWorkspaceSwitcher();
  const area = areaFromPathname(pathname);
  const route = routeFromPathname(pathname);
  const settingsRoute = settingsRouteFromPathname(pathname);
  const adminRoute = adminRouteFromPathname(pathname);
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
  // `session.isAdmin` gates the admin nav content itself, not only its own routes' server-side
  // gate: a non-admin who hand-navigates to `/admin/*` still gets `notFound()` from the route
  // (`admin/overview/page.tsx`), but the CHROME is mounted regardless (`app/(console)/layout.tsx`
  // wraps every route, 404s included) and reads its nav content off the pathname alone
  // (`areaFromPathname`) — so without this check, a non-admin visiting that dead URL would see
  // real admin-shaped nav rows around their own 404. Falls back to the ordinary account-area nav,
  // the same "never shown, not disabled" contract every other admin-only nav row in this file
  // already follows.
  const showAdminChrome = area === 'admin' && session.isAdmin;

  return (
    <ConsoleSidebar
      brand={<BrandMark hasCustomLogo={hasCustomLogo} />}
      workspaceSwitcher={
        area === 'settings' || showAdminChrome ? (
          <BackToConsoleRow accountId={switcher.accountId} />
        ) : (
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
        )
      }
      groups={
        showAdminChrome
          ? adminNavGroups(adminRoute, refillCount)
          : area === 'settings'
            ? settingsNavGroups(settingsRoute, session.isAdmin)
            : navGroups(route, switcher.accountId)
      }
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
          {/* Standalone Theme row IS BACK (owner finding, 2026-08-31: "I don't see the usage,
              for the theme to be hidden behind the account dropdown. Please put it outside") —
              reversing "Addition 5 dedupe" (2026-08-30), which had folded this row into
              `AccountMenu`'s own popup on the theory that a second control duplicated the first.
              The owner's read is the opposite: buried behind the account trigger, the control
              was undiscoverable, not merely duplicated. This is the one place preference lives
              now. Not a `<button className="sidebar-footer-row">` wrapper like Search:
              `ThemeToggle` is already its own interactive control (`ml-auto` trailing it, same
              slot Search's `kbd` hint sits in), so wrapping it in a second clickable row would
              nest two hit targets, the same reason the identity row below stays a plain `div`
              too. */}
          <div className="sidebar-footer-row">
            <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
            <span className="text-subtle font-sans text-[13px]">Theme</span>
            <ThemeToggle
              preference={preference}
              onPreferenceChange={setPreference}
              className="ml-auto"
            />
          </div>
          {online ? null : (
            <div className="sidebar-footer-row">
              {/* Empty icon-column spacer (rail-grid.ts rule 3) — an iconless row still reserves
                  the same 16px column every other footer/nav row's glyph sits in, so its text
                  starts at the one shared label x rather than flush at the row's own padding. */}
              <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
              <InlineStatus className="text-subtle">offline · showing cached data</InlineStatus>
            </div>
          )}
          {/* The identity row — owner ruling, 2026-08-31 (issue #368, `claude/sb-overlay-
              restyle`): "We don't need a drop down for the connected user, since it's in the left
              rail." `AccountMenu` is deleted outright; this row no longer opens a menu at all —
              it is the SAME icon-column/label/trailing-control shape the Theme row above uses,
              with sign out as a plain trailing icon button (per the rail grid's "the action that
              belongs to a row lives in that row" idiom) instead of one click deep behind a
              trigger only this row used to have. */}
          <div className="sidebar-footer-row">
            <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
              <span aria-hidden="true" className="avatar-chip-sm">
                {initialsFor(session.user?.name, identityLabel, session.user?.sub ?? '')}
              </span>
            </span>
            {(session.user?.name ?? identityLabel) ? (
              <span className="rail-row-label text-soft text-[13px]">
                {session.user?.name ?? identityLabel}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={signOut}
              className="ml-auto">
              <SignOutIcon />
            </Button>
          </div>
        </>
      }
    />
  );
}

/**
 * The mobile/tablet top bar's content — brand, a compact workspace switcher, the palette trigger
 * and the theme toggle. Below `md`, this replaces the sidebar entirely (nav lives in the bottom
 * dock `ConsoleSidebar` renders alongside the persistent sidebar).
 *
 * NO identity avatar renders here any more (owner ruling, 2026-08-31, issue #368: "We don't need
 * a drop down for the connected user, since it's in the left rail" — `AccountMenu`'s `inline`
 * variant is deleted outright). Below `md` there is no left rail either, so this band carries no
 * identity affordance of its own at all; sign out stays reachable everywhere, including here, via
 * the `⌘K` command palette's own "Sign out" action (`useConsolePalette`'s `actions` group, below).
 */
export function ConsoleTopBarContent({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const session = useConsoleSession();
  const hasCustomLogo = useConsoleBrandingLogo();
  const { preference, setPreference } = useConsoleTheme();
  const switcher = useWorkspaceSwitcher();
  const area = areaFromPathname(pathname);
  // Same fallback `ConsoleSidebarContent` applies to its own workspace-switcher slot — see that
  // component's own doc comment for why a non-admin's dead `/admin/*` visit must never show
  // admin-shaped chrome around its 404.
  const showAdminChrome = area === 'admin' && session.isAdmin;

  return (
    <ConsoleTopBar
      brand={<BrandMark hasCustomLogo={hasCustomLogo} />}
      workspaceSwitcher={
        area === 'settings' || showAdminChrome ? (
          <BackToConsoleCompact accountId={switcher.accountId} />
        ) : (
          <AccountBadge
            accountId={switcher.accountId}
            name={switcher.name}
            accounts={switcher.accounts}
            onSelectAccount={switcher.onSelectAccount}
            onCopyId={switcher.onCopyId}
            onCreateAccount={switcher.onCreateAccount}
          />
        )
      }
      paletteTrigger={<CommandPaletteTrigger onClick={onOpenPalette} />}
      trailing={<ThemeToggle preference={preference} onPreferenceChange={setPreference} />}
    />
  );
}
