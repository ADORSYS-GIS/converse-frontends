import { describe, expect, it } from 'vitest';

import {
  adminLandingHref,
  adminNavGroups,
  adminRouteFromPathname,
  areaFromPathname,
  initialsFor,
  navGroups,
  navHrefs,
  routeFromPathname,
  settingsNavGroups,
  settingsRouteFromPathname,
} from './console-chrome';
import { englishT } from '../test/english-t';

/** Real English copy, resolved from the shipped bundle — see `englishT`'s own doc comment for
 *  why this is not a `(key) => key` stub. */
const NAV_T = englishT('nav');

describe('initialsFor', () => {
  it('builds a two-letter monogram from a real name', () => {
    expect(initialsFor('Jane Doe', undefined, 'acct_irrelevant')).toBe('JD');
  });

  it('falls back to the email when there is no name', () => {
    expect(initialsFor(undefined, 'jane.doe@example.com', 'acct_irrelevant')).toBe('JD');
  });

  it('never renders the old placeholder glyph for an unnamed account with no email', () => {
    // Live findings #7 (2026-08-30): both the sidebar workspace switcher chip and the identity
    // avatar used to render '··' here — a glyph that carries no information.
    const initials = initialsFor(undefined, undefined, '97de3164-9c1d-4af2-8a71-11572288b729');
    expect(initials).not.toBe('··');
  });

  it('falls back to the first character of the account short label, unnamed and emailless', () => {
    // `shortAccountId('97de3164-...')` is `acct_97de3164`; its first character is the glyph.
    expect(initialsFor(undefined, undefined, '97de3164-9c1d-4af2-8a71-11572288b729')).toBe('a');
  });

  it('falls back to an em dash when even the id is missing', () => {
    expect(initialsFor(undefined, undefined, '')).toBe('—');
  });
});

/** IA v3 phase 1 ("account into the path") — the account-scoped destinations move under
 *  `/accounts/[accountId]/*`; `settings` stays put. IA v3 phase E ("the settings/accounts move")
 *  narrows the account-scoped table to `overview`/`api-keys` — `projects`/`refill` both moved to
 *  `/settings/accounts/<id>/*`. ADR 0013's same-day "the admin area" amendment points `admin` at
 *  `/admin/overview`, the operator dashboard, rather than the refills queue directly. */
describe('navHrefs', () => {
  it('builds /accounts/<id>/<segment> for the two account-scoped destinations left', () => {
    expect(navHrefs('acct_1')).toEqual({
      overview: '/accounts/acct_1/overview',
      'api-keys': '/accounts/acct_1/api-keys',
      settings: '/settings',
      admin: '/admin/overview',
    });
  });

  it('routes through the / resolver, never a broken /accounts//<segment>, when no account id is known yet', () => {
    expect(navHrefs('')).toEqual({
      overview: '/',
      'api-keys': '/?next=api-keys',
      settings: '/settings',
      admin: '/admin/overview',
    });
  });
});

describe('routeFromPathname', () => {
  it('reads the account-scoped segment out of /accounts/<id>/<segment>', () => {
    expect(routeFromPathname('/accounts/acct_1/overview')).toBe('overview');
    expect(routeFromPathname('/accounts/acct_1/api-keys')).toBe('api-keys');
  });

  it('reads the moved /settings/accounts/<id>/projects tree as settings, not a stale "projects" route', () => {
    expect(routeFromPathname('/settings/accounts/acct_1/projects')).toBe('settings');
  });

  it('matches /settings/* by its plain prefix', () => {
    expect(routeFromPathname('/settings/policies')).toBe('settings');
  });

  it('matches /admin/* by its own plain prefix — a live area again, not folded into settings', () => {
    expect(routeFromPathname('/admin/overview')).toBe('admin');
    expect(routeFromPathname('/admin/refills-queue')).toBe('admin');
  });

  it('defaults to overview for / (the account resolver) and anything unrecognised', () => {
    expect(routeFromPathname('/')).toBe('overview');
    expect(routeFromPathname('/something-else')).toBe('overview');
  });
});

describe('areaFromPathname', () => {
  it('reads any /settings/* pathname as the settings area', () => {
    expect(areaFromPathname('/settings')).toBe('settings');
    expect(areaFromPathname('/settings/policies')).toBe('settings');
  });

  it('reads any /admin/* pathname as the admin area', () => {
    expect(areaFromPathname('/admin')).toBe('admin');
    expect(areaFromPathname('/admin/overview')).toBe('admin');
    expect(areaFromPathname('/admin/refills-queue')).toBe('admin');
  });

  it('reads every other pathname as the account area', () => {
    expect(areaFromPathname('/')).toBe('account');
    expect(areaFromPathname('/accounts/acct_1/overview')).toBe('account');
  });
});

describe('settingsRouteFromPathname', () => {
  it('matches each live settings segment by its plain prefix', () => {
    expect(settingsRouteFromPathname('/settings/accounts')).toBe('accounts');
    expect(settingsRouteFromPathname('/settings/tiers')).toBe('tiers');
    expect(settingsRouteFromPathname('/settings/policies')).toBe('policies');
    expect(settingsRouteFromPathname('/settings/info')).toBe('info');
  });

  it('matches the whole /settings/accounts/<id>/* subtree as one destination', () => {
    expect(settingsRouteFromPathname('/settings/accounts/acct_1')).toBe('accounts');
    expect(settingsRouteFromPathname('/settings/accounts/acct_1/projects')).toBe('accounts');
    expect(settingsRouteFromPathname('/settings/accounts/acct_1/request-refill')).toBe('accounts');
  });

  it('defaults to overview for a bare /settings (mid-redirect) or anything unrecognised', () => {
    expect(settingsRouteFromPathname('/settings')).toBe('overview');
    expect(settingsRouteFromPathname('/settings/overview')).toBe('overview');
    expect(settingsRouteFromPathname('/settings/overview/usage')).toBe('overview');
    // The refills queue moved OUT of the settings area (ADR 0013's admin-area amendment) — a
    // stale `/settings/refills-queue` link 308s before this ever runs, but this function itself
    // no longer recognises the segment, same as any other unrecognised path. Same for
    // refill-options, moved out the same day (owner ruling, converse-frontends#368).
    expect(settingsRouteFromPathname('/settings/refills-queue')).toBe('overview');
    expect(settingsRouteFromPathname('/settings/refill-options')).toBe('overview');
  });
});

// Owner directive, 2026-09-03, verbatim: "The Admin button doesn't need to be hidden now, since
// it's gated by permission. So it can appear on the main left rail. The Roles button in Settings'
// left rail can safely be removed." Both rows that pointed OUT of the settings area are gone.
//
// The builder still takes a permission set, for ONE row: "Tier configs", gated on `project:update`
// (owner ruling the same day, verbatim: "users with the role -viewer should not even see tiers").
describe('settingsNavGroups', () => {
  /** `default_role_permissions()` (`lightbridge-authz-core/src/authz.rs`), verbatim — the two role
   *  shapes the tiers ruling draws its line between. `project:*`/`apikey:*` are already expanded
   *  by the backend before `getMyAccess` answers with them, so the editor set names its members. */
  const VIEWER = [
    'account:create',
    'account:read',
    'project:read',
    'apikey:read',
    'session:revoke-own',
    'budget:read-own',
  ];
  const EDITOR = [
    'account:create',
    'account:read',
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'project:disable',
    'project:member',
    'apikey:create',
    'apikey:read',
    'apikey:update',
    'apikey:delete',
    'apikey:revoke',
    'apikey:rotate',
    'apikey:validate',
    'session:revoke-own',
    'budget:read-own',
  ];

  it('lists the five live settings destinations, in the owner-dictated order', () => {
    const [group] = settingsNavGroups('overview', EDITOR, NAV_T);

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'accounts',
      'tiers',
      'policies',
      'info',
    ]);
    // Every row is a destination of THIS area now — no row links out of `/settings/*`.
    expect(group.items.every((item) => item.href?.startsWith('/settings/'))).toBe(true);
  });

  // Owner ruling, 2026-09-03, verbatim: "users with the role -viewer should not even see tiers."
  // The gate is `project:update` — the permission `setProjectQuota` requires — so it lands exactly
  // between the two default roles rather than on a role string.
  it('omits Tier configs for a lightbridge-viewer — never a disabled placeholder', () => {
    const [group] = settingsNavGroups('overview', VIEWER, NAV_T);

    expect(group.items.find((item) => item.key === 'tiers')).toBeUndefined();
    // …and the rest of the settings area is untouched: this narrows one row, not the area.
    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'accounts',
      'policies',
      'info',
    ]);
    expect(group.items.filter((item) => item.disabled)).toEqual([]);
  });

  it('keeps Tier configs for a lightbridge-editor, in its usual slot', () => {
    const [group] = settingsNavGroups('tiers', EDITOR, NAV_T);
    const tiers = group.items.find((item) => item.key === 'tiers');

    expect(tiers?.href).toBe('/settings/tiers');
    expect(tiers?.active).toBe(true);
    expect(tiers?.disabled).toBeUndefined();
  });

  it('places Accounts right after Overview, and navigates to /settings/accounts', () => {
    const [group] = settingsNavGroups('accounts', EDITOR, NAV_T);
    const accounts = group.items.find((item) => item.key === 'accounts');

    expect(group.items[1]?.key).toBe('accounts');
    expect(accounts?.href).toBe('/settings/accounts');
    expect(accounts?.active).toBe(true);
    expect(accounts?.disabled).toBeUndefined();
  });

  // The row was live and gated on `rbac:manage` (converse-frontends#452) after a spell as a
  // `disabled` placeholder. It is deleted outright now — `/admin/roles` keeps its one nav home in
  // the admin area's own list (`adminNavGroups`), so this was a second entrance to somebody else's
  // destination rather than a settings one.
  it('lists no Roles row at all — /admin/roles belongs to the admin area only', () => {
    const [group] = settingsNavGroups('overview', EDITOR, NAV_T);
    expect(group.items.find((item) => item.key === 'roles')).toBeUndefined();
  });

  it('no longer lists a refills-queue or refill-options row at all — both moved to the admin area', () => {
    const [group] = settingsNavGroups('overview', EDITOR, NAV_T);
    expect(group.items.find((item) => item.key === 'refills-queue')).toBeUndefined();
    expect(group.items.find((item) => item.key === 'refill-options')).toBeUndefined();
  });

  // The 2026-08-31 "the admin shortcut lives in settings" placement is superseded: the row sits on
  // the account area's main rail now (`navGroups`' own tests below), never in both places at once.
  it('lists no Admin row any more — it moved to the account rail', () => {
    const [group] = settingsNavGroups('overview', EDITOR, NAV_T);
    expect(group.items.find((item) => item.key === 'admin')).toBeUndefined();
  });

  it('points every row at a live route — no disabled placeholder survives', () => {
    const [group] = settingsNavGroups('overview', EDITOR, NAV_T);
    expect(group.items.filter((item) => item.disabled)).toEqual([]);
    expect(group.items.filter((item) => !item.href)).toEqual([]);
  });
});

describe('adminLandingHref', () => {
  it('walks the nav order and returns the first destination the caller can open', () => {
    expect(adminLandingHref(['usage:read-all', 'rbac:manage'])).toBe('/admin/overview');
    expect(adminLandingHref(['budget:policy-write', 'rbac:manage'])).toBe('/admin/refill-policies');
    expect(adminLandingHref(['rbac:manage'])).toBe('/admin/roles');
  });
});

// Owner directive, 2026-09-03, verbatim: "The Admin button doesn't need to be hidden now, since
// it's gated by permission. So it can appear on the main left rail." The account rail gains a
// third group, Operator, holding one permission-gated "Admin" row — superseding the 2026-08-31
// owner-review-round-2 ruling that had put that row one level in, inside settings. What that
// earlier ruling rejected was a DISHONEST row ("Refill requests", landing on `/admin/overview`)
// gated on `isAdmin`, a role production minted for every signed-in person; this one says where it
// goes and is gated on `ADMIN_AREA_PERMISSIONS`, which the backend actually enforces.
describe('navGroups', () => {
  const NONE: string[] = [];
  const REVIEWER_ONLY = ['budget:review'];
  const FULL = [
    'usage:read-all',
    'budget:review',
    'budget:policy-write',
    'budget:schedule-manage',
    'session:read',
    'rbac:manage',
  ];

  it('lists exactly Workspace and Account for a viewer with no admin-area permission', () => {
    const groups = navGroups('overview', 'acct_1', NONE, NAV_T);

    expect(groups.map((group) => group.key)).toEqual(['workspace', 'account']);
    expect(groups.flatMap((group) => group.items).map((item) => item.key)).toEqual([
      'overview',
      'api-keys',
      'settings',
    ]);
  });

  it('adds the Operator group, with its one Admin row, for a full admin', () => {
    const groups = navGroups('overview', 'acct_1', FULL, NAV_T);

    expect(groups.map((group) => group.key)).toEqual(['workspace', 'account', 'operator']);
    const operator = groups[2];
    expect(operator.label).toBe('Operator');
    expect(operator.items.map((item) => item.key)).toEqual(['admin']);
    expect(operator.items[0]?.label).toBe('Admin');
    expect(operator.items[0]?.href).toBe('/admin/overview');
  });

  // ANY one admin-area permission is enough, and the row aims at what THAT permission opens: a
  // reviewer holding only `budget:review` would 404 on `/admin/overview` (gated on
  // `usage:read-all`), which is the "shown and then 404s" failure the gate tests exist to prevent.
  it('shows the row for a lone budget:review grant, aimed at the refills queue', () => {
    const groups = navGroups('overview', 'acct_1', REVIEWER_ONLY, NAV_T);
    const admin = groups.flatMap((group) => group.items).find((item) => item.key === 'admin');

    expect(admin).toBeDefined();
    expect(admin?.href).toBe('/admin/refills-queue');
  });

  it('omits the Operator group entirely for a viewer — never a disabled placeholder', () => {
    const groups = navGroups('overview', 'acct_1', NONE, NAV_T);

    expect(groups.find((group) => group.key === 'operator')).toBeUndefined();
    expect(
      groups.flatMap((group) => group.items).find((item) => item.key === 'admin')
    ).toBeUndefined();
  });

  // The pending-refill numeral keeps exactly one home, `adminNavGroups`' own "Refills queue" row.
  // A count hanging off a row labelled "Admin" would be the old dishonesty in a new place.
  it('never carries a trailing count on the Admin row', () => {
    const groups = navGroups('overview', 'acct_1', FULL, NAV_T);
    const admin = groups.flatMap((group) => group.items).find((item) => item.key === 'admin');

    expect(admin?.count).toBeUndefined();
  });

  // Never `active`: once the visitor is on `/admin/*`, `ConsoleSidebarContent` has swapped the
  // whole rail to `adminNavGroups`, so this row is never rendered alongside its own destination.
  it('never marks the Admin row active, even on the admin route', () => {
    const groups = navGroups('admin', 'acct_1', FULL, NAV_T);
    const admin = groups.flatMap((group) => group.items).find((item) => item.key === 'admin');

    expect(admin?.active).toBe(false);
  });

  it('marks the active row off the given ConsoleRoute', () => {
    const groups = navGroups('api-keys', 'acct_1', NONE, NAV_T);
    const items = groups.flatMap((group) => group.items);

    expect(items.find((item) => item.key === 'api-keys')?.active).toBe(true);
    expect(items.find((item) => item.key === 'overview')?.active).toBe(false);
  });

  it('builds every href off the given account id', () => {
    const groups = navGroups('overview', 'acct_1', NONE, NAV_T);
    const items = groups.flatMap((group) => group.items);

    expect(items.find((item) => item.key === 'overview')?.href).toBe('/accounts/acct_1/overview');
    expect(items.find((item) => item.key === 'api-keys')?.href).toBe('/accounts/acct_1/api-keys');
    expect(items.find((item) => item.key === 'settings')?.href).toBe('/settings');
  });
});

// ADR 0013's same-day "the admin area" amendment.
describe('adminRouteFromPathname', () => {
  it('matches /admin/refills-queue by its own prefix', () => {
    expect(adminRouteFromPathname('/admin/refills-queue')).toBe('refills-queue');
  });

  // converse-frontends#448 — and by PREFIX, so C6's drill-downs keep the Usage row lit instead of
  // falling through to Overview.
  it('matches /admin/usage and every route below it', () => {
    expect(adminRouteFromPathname('/admin/usage')).toBe('usage');
    expect(adminRouteFromPathname('/admin/usage/actors/usr_1?type=user')).toBe('usage');
    expect(adminRouteFromPathname('/admin/usage/channels/console')).toBe('usage');
    expect(adminRouteFromPathname('/admin/usage/chats')).toBe('usage');
  });

  it('matches /admin/refill-policies by its own prefix', () => {
    expect(adminRouteFromPathname('/admin/refill-policies')).toBe('refill-policies');
  });

  it('matches /admin/budget-schedules by its own prefix, create route included', () => {
    expect(adminRouteFromPathname('/admin/budget-schedules')).toBe('budget-schedules');
    expect(adminRouteFromPathname('/admin/budget-schedules/create')).toBe('budget-schedules');
  });

  // converse-frontends#450 (story C7).
  it('matches /admin/sessions by its own prefix', () => {
    expect(adminRouteFromPathname('/admin/sessions')).toBe('sessions');
    expect(adminRouteFromPathname('/admin/sessions?status=all')).toBe('sessions');
  });

  it('matches /admin/roles by its own prefix', () => {
    expect(adminRouteFromPathname('/admin/roles')).toBe('roles');
  });

  it('defaults to overview for the bare /admin segment (mid-redirect) or anything unrecognised', () => {
    expect(adminRouteFromPathname('/admin')).toBe('overview');
    expect(adminRouteFromPathname('/admin/overview')).toBe('overview');
  });
});

describe('adminNavGroups', () => {
  const FULL = [
    'usage:read-all',
    'budget:review',
    'budget:policy-write',
    'budget:schedule-manage',
    'session:read',
    'rbac:manage',
  ];

  // Readings first, then actions. Usage sits SECOND, between the dashboard and the three budget
  // rows: overview answers "is anything wrong", usage answers "where did it come from", and the
  // rest are things an operator DOES (converse-frontends#448). Sessions (converse-frontends#450)
  // and Roles (converse-frontends#452) are last, in that order — both are facts about the
  // operators rather than the estate, and closing a session is the one reached for more often.
  it('lists all seven admin destinations, dashboard first and usage second', () => {
    const [group] = adminNavGroups('overview', FULL, NAV_T);

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'usage',
      'refills-queue',
      'refill-policies',
      'budget-schedules',
      'sessions',
      'roles',
    ]);
    expect(group.items[0]?.href).toBe('/admin/overview');
    expect(group.items[1]?.href).toBe('/admin/usage');
    expect(group.items[2]?.href).toBe('/admin/refills-queue');
    expect(group.items[3]?.href).toBe('/admin/refill-policies');
    expect(group.items[4]?.href).toBe('/admin/budget-schedules');
    expect(group.items[5]?.href).toBe('/admin/sessions');
    expect(group.items[6]?.href).toBe('/admin/roles');
  });

  // converse-frontends#450: `session:read` is a destination of its own, so it must unlock the
  // Sessions row on its own — someone granted nothing but the ability to close sessions still has
  // one real screen. It must NOT unlock any other row.
  it('unlocks the Sessions row, and only that row, from a lone session:read grant', () => {
    const [group] = adminNavGroups('sessions', ['session:read'], NAV_T);

    expect(group.items.map((item) => item.key)).toEqual(['sessions']);
    expect(group.items[0]?.label).toBe('Sessions');
    expect(group.items[0]?.active).toBe(true);
    expect(group.items[0]?.count).toBeUndefined();
  });

  it('marks the usage row active off the given AdminRoute, and carries no count', () => {
    const [group] = adminNavGroups('usage', FULL, NAV_T, 4);
    const usage = group.items.find((item) => item.key === 'usage');

    expect(usage?.active).toBe(true);
    expect(usage?.count).toBeUndefined();
  });

  // converse-frontends#452: admin is not one indivisible role any more. Five independent grants,
  // independently-filtered rows — and each row's route segment answers `notFound()` for the same
  // permission set, so a visible row must never point at a URL the server denies.
  it('shows only the rows whose permission the caller holds', () => {
    const [group] = adminNavGroups('refills-queue', ['budget:review'], NAV_T);

    expect(group.items.map((item) => item.key)).toEqual(['refills-queue']);
  });

  // One grant, two destinations: `/admin/overview` and `/admin/usage` both read `scope: 'all'`.
  it('unlocks both estate-read rows from the single usage:read-all grant', () => {
    const [group] = adminNavGroups('overview', ['usage:read-all'], NAV_T);

    expect(group.items.map((item) => item.key)).toEqual(['overview', 'usage']);
  });

  it('renders no rows at all for a caller holding no admin-area permission', () => {
    const [group] = adminNavGroups('overview', [], NAV_T);
    expect(group.items).toEqual([]);
  });

  it('marks the active row off the given AdminRoute', () => {
    const [group] = adminNavGroups('refills-queue', FULL, NAV_T);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');
    const overview = group.items.find((item) => item.key === 'overview');

    expect(refillsQueue?.active).toBe(true);
    expect(overview?.active).toBe(false);
  });

  it('carries the trailing refill count on refills-queue only', () => {
    const [group] = adminNavGroups('overview', FULL, NAV_T, 4);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');
    const overview = group.items.find((item) => item.key === 'overview');

    expect(refillsQueue?.count).toBe(4);
    expect(overview?.count).toBeUndefined();
  });

  it('shows no count while it is loading/zero — never a fabricated 0', () => {
    const [group] = adminNavGroups('overview', FULL, NAV_T, undefined);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');

    expect(refillsQueue?.count).toBeUndefined();
  });

  it('marks refill-policies active off the given AdminRoute, and carries no count', () => {
    const [group] = adminNavGroups('refill-policies', FULL, NAV_T, 4);
    const refillPolicies = group.items.find((item) => item.key === 'refill-policies');

    expect(refillPolicies?.active).toBe(true);
    expect(refillPolicies?.count).toBeUndefined();
  });

  // converse-frontends#451 (story C8).
  it('marks budget-schedules active off the given AdminRoute, and carries no count', () => {
    const [group] = adminNavGroups('budget-schedules', FULL, NAV_T, 4);
    const schedules = group.items.find((item) => item.key === 'budget-schedules');

    expect(schedules?.active).toBe(true);
    expect(schedules?.count).toBeUndefined();
    expect(group.items.find((item) => item.key === 'overview')?.active).toBe(false);
  });
});
