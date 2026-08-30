import { describe, expect, it } from 'vitest';

import {
  areaFromPathname,
  initialsFor,
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

/** IA v3 phase 1 ("account into the path") — the three account-scoped destinations move under
 *  `/accounts/[accountId]/*`; `settings` stays put. IA v3 phase 2 ("the settings area") folds
 *  `admin` into `/settings/refills-queue` — the deleted `/admin` route's replacement. */
describe('navHrefs', () => {
  it('builds /accounts/<id>/<segment> for the three account-scoped destinations', () => {
    expect(navHrefs('acct_1')).toEqual({
      overview: '/accounts/acct_1/overview',
      'api-keys': '/accounts/acct_1/api-keys',
      projects: '/accounts/acct_1/projects',
      settings: '/settings',
      admin: '/settings/refills-queue',
    });
  });

  it('routes through the / resolver, never a broken /accounts//<segment>, when no account id is known yet', () => {
    expect(navHrefs('')).toEqual({
      overview: '/',
      'api-keys': '/?next=api-keys',
      projects: '/?next=projects',
      settings: '/settings',
      admin: '/settings/refills-queue',
    });
  });
});

describe('routeFromPathname', () => {
  it('reads the account-scoped segment out of /accounts/<id>/<segment>', () => {
    expect(routeFromPathname('/accounts/acct_1/overview')).toBe('overview');
    expect(routeFromPathname('/accounts/acct_1/projects')).toBe('projects');
    expect(routeFromPathname('/accounts/acct_1/api-keys')).toBe('api-keys');
  });

  it('matches /settings/* by its plain prefix — including the former /admin, now /settings/refills-queue', () => {
    expect(routeFromPathname('/settings/policies')).toBe('settings');
    expect(routeFromPathname('/settings/refills-queue')).toBe('settings');
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
    expect(areaFromPathname('/settings/refills-queue')).toBe('settings');
  });

  it('reads every other pathname as the account area', () => {
    expect(areaFromPathname('/')).toBe('account');
    expect(areaFromPathname('/accounts/acct_1/overview')).toBe('account');
  });
});

describe('settingsRouteFromPathname', () => {
  it('matches each live settings segment by its plain prefix', () => {
    expect(settingsRouteFromPathname('/settings/tiers')).toBe('tiers');
    expect(settingsRouteFromPathname('/settings/policies')).toBe('policies');
    expect(settingsRouteFromPathname('/settings/refills-queue')).toBe('refills-queue');
    expect(settingsRouteFromPathname('/settings/info')).toBe('info');
  });

  it('defaults to overview for a bare /settings (mid-redirect) or anything unrecognised', () => {
    expect(settingsRouteFromPathname('/settings')).toBe('overview');
    expect(settingsRouteFromPathname('/settings/overview')).toBe('overview');
    expect(settingsRouteFromPathname('/settings/overview/usage')).toBe('overview');
  });
});

describe('settingsNavGroups', () => {
  it('lists all seven destinations in the owner-dictated order, for an admin', () => {
    const [group] = settingsNavGroups('overview', true, 3);

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'roles',
      'tiers',
      'policies',
      'refill-options',
      'refills-queue',
      'info',
    ]);
  });

  it('omits refills-queue entirely for a non-admin — never shown then denied', () => {
    const [group] = settingsNavGroups('overview', false);

    expect(group.items.map((item) => item.key)).toEqual([
      'overview',
      'roles',
      'tiers',
      'policies',
      'refill-options',
      'info',
    ]);
  });

  it('disables roles and refill-options, each with a stated, non-navigable reason', () => {
    const [group] = settingsNavGroups('overview', true);
    const roles = group.items.find((item) => item.key === 'roles');
    const refillOptions = group.items.find((item) => item.key === 'refill-options');

    expect(roles?.disabled).toBe(true);
    expect(roles?.href).toBeUndefined();
    expect(roles?.reason).toMatch(/lightbridge-authz#571/);
    expect(refillOptions?.disabled).toBe(true);
    expect(refillOptions?.href).toBeUndefined();
    expect(refillOptions?.reason).toMatch(/converse-frontends#368/);
  });

  it('carries the trailing refill count on refills-queue, and marks the active row', () => {
    const [group] = settingsNavGroups('refills-queue', true, 4);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');

    expect(refillsQueue?.count).toBe(4);
    expect(refillsQueue?.active).toBe(true);
    expect(refillsQueue?.href).toBe('/settings/refills-queue');
  });

  it('shows no count while it is loading/zero — never a fabricated 0', () => {
    const [group] = settingsNavGroups('overview', true, undefined);
    const refillsQueue = group.items.find((item) => item.key === 'refills-queue');

    expect(refillsQueue?.count).toBeUndefined();
  });
});
