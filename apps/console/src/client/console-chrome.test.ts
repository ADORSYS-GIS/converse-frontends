import { describe, expect, it } from 'vitest';

import {
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

describe('settingsNavGroups', () => {
  it('lists all six real destinations in the owner-dictated order for a non-admin — no gated Admin row', () => {
    const [group] = settingsNavGroups('overview', false);

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'accounts',
      'roles',
      'tiers',
      'policies',
      'info',
    ]);
  });

  it('places Accounts right after Overview, and navigates to /settings/accounts', () => {
    const [group] = settingsNavGroups('accounts', false);
    const accounts = group.items.find((item) => item.key === 'accounts');

    expect(group.items[1]?.key).toBe('accounts');
    expect(accounts?.href).toBe('/settings/accounts');
    expect(accounts?.active).toBe(true);
    expect(accounts?.disabled).toBeUndefined();
  });

  it('disables roles alone, with a stated, non-navigable reason', () => {
    const [group] = settingsNavGroups('overview', false);
    const roles = group.items.find((item) => item.key === 'roles');

    expect(roles?.disabled).toBe(true);
    expect(roles?.href).toBeUndefined();
    expect(roles?.reason).toMatch(/lightbridge-authz#571/);
  });

  it('no longer lists a refills-queue or refill-options row at all — both moved to the admin area', () => {
    const [group] = settingsNavGroups('overview', false);
    expect(group.items.find((item) => item.key === 'refills-queue')).toBeUndefined();
    expect(group.items.find((item) => item.key === 'refill-options')).toBeUndefined();
  });

  // Owner review round 2 (2026-08-31, converse-frontends#368 finding #1, verbatim): "Instead,
  // inside of the settings, place a permission gated button 'Admin' that leads to admin." — the
  // ONE way an admin now reaches `/admin` from the chrome (the account-area rail's Operator row
  // that used to shortcut there directly is deleted outright, `navGroups`' own tests below).
  it('appends a gated Admin row LAST, linking to /admin/overview, only for an admin', () => {
    const [group] = settingsNavGroups('overview', true);

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'accounts',
      'roles',
      'tiers',
      'policies',
      'info',
      'admin',
    ]);
    const admin = group.items.find((item) => item.key === 'admin');
    expect(admin?.href).toBe('/admin/overview');
    expect(admin?.disabled).toBeUndefined();
  });

  it('omits the Admin row entirely for a non-admin, never a disabled placeholder', () => {
    const [group] = settingsNavGroups('overview', false);
    expect(group.items.find((item) => item.key === 'admin')).toBeUndefined();
  });
});

// Owner review round 2 (2026-08-31, converse-frontends#368 finding #1, verbatim): "Which button
// leads to the admin pages? Oh wait, it's the button 'Refill queue' that leads to 'admin'? Please
// remove that." — the account-area rail's Operator group is deleted outright, not relabelled or
// re-gated: `navGroups` now takes no `isAdmin`/`refillCount` params at all, since nothing here
// reads a role or a count any more.
describe('navGroups', () => {
  it('lists exactly the two fixed groups, Workspace and Account — no Operator group, ever', () => {
    const groups = navGroups('overview', 'acct_1');

    expect(groups.map((group) => group.key)).toEqual(['workspace', 'account']);
    expect(groups.flatMap((group) => group.items).map((item) => item.key)).toEqual([
      'overview',
      'api-keys',
      'settings',
    ]);
  });

  it('marks the active row off the given ConsoleRoute', () => {
    const groups = navGroups('api-keys', 'acct_1');
    const items = groups.flatMap((group) => group.items);

    expect(items.find((item) => item.key === 'api-keys')?.active).toBe(true);
    expect(items.find((item) => item.key === 'overview')?.active).toBe(false);
  });

  it('builds every href off the given account id', () => {
    const groups = navGroups('overview', 'acct_1');
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

  it('matches /admin/refill-policies by its own prefix', () => {
    expect(adminRouteFromPathname('/admin/refill-policies')).toBe('refill-policies');
  });

  it('defaults to overview for the bare /admin segment (mid-redirect) or anything unrecognised', () => {
    expect(adminRouteFromPathname('/admin')).toBe('overview');
    expect(adminRouteFromPathname('/admin/overview')).toBe('overview');
  });
});

describe('adminNavGroups', () => {
  it('lists all three admin destinations, dashboard first', () => {
    const [group] = adminNavGroups('overview');

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'refills-queue',
      'refill-policies',
    ]);
    expect(group.items[0]?.href).toBe('/admin/overview');
    expect(group.items[1]?.href).toBe('/admin/refills-queue');
    expect(group.items[2]?.href).toBe('/admin/refill-policies');
  });

  it('marks the active row off the given AdminRoute', () => {
    const [group] = adminNavGroups('refills-queue');
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');
    const overview = group.items.find((item) => item.key === 'overview');

    expect(refillsQueue?.active).toBe(true);
    expect(overview?.active).toBe(false);
  });

  it('carries the trailing refill count on refills-queue only', () => {
    const [group] = adminNavGroups('overview', 4);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');
    const overview = group.items.find((item) => item.key === 'overview');

    expect(refillsQueue?.count).toBe(4);
    expect(overview?.count).toBeUndefined();
  });

  it('shows no count while it is loading/zero — never a fabricated 0', () => {
    const [group] = adminNavGroups('overview', undefined);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');

    expect(refillsQueue?.count).toBeUndefined();
  });

  it('marks refill-policies active off the given AdminRoute, and carries no count', () => {
    const [group] = adminNavGroups('refill-policies', 4);
    const refillPolicies = group.items.find((item) => item.key === 'refill-policies');

    expect(refillPolicies?.active).toBe(true);
    expect(refillPolicies?.count).toBeUndefined();
  });
});
