import { describe, expect, it } from 'vitest';

import { initialsFor, navHrefs, routeFromPathname } from './console-chrome';

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
 *  `/accounts/[accountId]/*`; `settings`/`admin` stay put this phase. */
describe('navHrefs', () => {
  it('builds /accounts/<id>/<segment> for the three account-scoped destinations', () => {
    expect(navHrefs('acct_1')).toEqual({
      overview: '/accounts/acct_1/overview',
      'api-keys': '/accounts/acct_1/api-keys',
      projects: '/accounts/acct_1/projects',
      settings: '/settings',
      admin: '/admin',
    });
  });

  it('routes through the / resolver, never a broken /accounts//<segment>, when no account id is known yet', () => {
    expect(navHrefs('')).toEqual({
      overview: '/',
      'api-keys': '/?next=api-keys',
      projects: '/?next=projects',
      settings: '/settings',
      admin: '/admin',
    });
  });
});

describe('routeFromPathname', () => {
  it('reads the account-scoped segment out of /accounts/<id>/<segment>', () => {
    expect(routeFromPathname('/accounts/acct_1/overview')).toBe('overview');
    expect(routeFromPathname('/accounts/acct_1/projects')).toBe('projects');
    expect(routeFromPathname('/accounts/acct_1/api-keys')).toBe('api-keys');
  });

  it('still matches /settings/* and /admin by their plain prefix', () => {
    expect(routeFromPathname('/settings/account')).toBe('settings');
    expect(routeFromPathname('/settings/projects')).toBe('settings');
    expect(routeFromPathname('/admin')).toBe('admin');
  });

  it('defaults to overview for / (the account resolver) and anything unrecognised', () => {
    expect(routeFromPathname('/')).toBe('overview');
    expect(routeFromPathname('/something-else')).toBe('overview');
  });
});
