import type { PlatformRoleGrant, UserProfile } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  formatGrantTimestamp,
  grantIdentityIdsOf,
  toGrantAuthor,
  toPlatformRoleGrantRow,
} from './role-grant-rows';

function grant(overrides: Partial<PlatformRoleGrant> = {}): PlatformRoleGrant {
  return {
    id: 'grant_1',
    userId: 'person_ada',
    role: 'lightbridge-admin',
    grantedBy: 'person_steph',
    grantedAt: '2026-09-01T09:12:34.000Z',
    revokedAt: null,
    reason: 'On-call operator.',
    ...overrides,
  };
}

const profiles = new Map<string, UserProfile>([
  [
    'person_ada',
    {
      userId: 'person_ada',
      displayName: 'Ada Nkemdirim',
      email: 'ada@example.com',
      username: 'ada',
    },
  ],
  [
    'person_steph',
    { userId: 'person_steph', displayName: 'Stephane Segning', email: null, username: null },
  ],
]);

describe('grantIdentityIdsOf', () => {
  it('collects holders AND granters, de-duplicated and sorted', () => {
    // Sorted because the list IS the react-query cache key: ['b','a'] and ['a','b'] are the same
    // request but two cache entries otherwise, which turns one batch per page into two.
    expect(
      grantIdentityIdsOf([
        grant({ userId: 'b', grantedBy: 'a' }),
        grant({ userId: 'a', grantedBy: 'c' }),
      ])
    ).toEqual(['a', 'b', 'c']);
  });

  it('skips a CLI-bootstrap grant’s null granter rather than looking it up', () => {
    expect(grantIdentityIdsOf([grant({ userId: 'a', grantedBy: null })])).toEqual(['a']);
  });
});

describe('toGrantAuthor', () => {
  // The schema is explicit: NULL `granted_by` is the CLI bootstrap — "render it as 'CLI
  // bootstrap', never as 'unknown'". It is a permanent fact about the row, not a missing value.
  it('maps a null granter to the CLI-bootstrap branch, never to an unresolved person', () => {
    expect(toGrantAuthor(null, profiles)).toEqual({ kind: 'cli' });
    expect(toGrantAuthor(undefined, profiles)).toEqual({ kind: 'cli' });
  });

  it('resolves a real granter through the shared identity mapping', () => {
    expect(toGrantAuthor('person_ada', profiles)).toEqual({
      kind: 'user',
      name: 'Ada Nkemdirim',
      email: 'ada@example.com',
    });
  });

  it('distinguishes “not asked yet” from “asked and got nothing”', () => {
    expect(toGrantAuthor('person_x', undefined)).toEqual({ kind: 'resolving' });
    expect(toGrantAuthor('person_x', profiles)).toEqual({ kind: 'unresolved', userId: 'person_x' });
  });
});

describe('formatGrantTimestamp', () => {
  it('renders a whole-minute local timestamp', () => {
    // An audit trail answers WHEN, not "how long ago" — "3 months ago" is unusable for lining a
    // grant up against an incident timeline. Asserted on shape rather than an absolute value, so
    // the test does not depend on the machine's zone.
    expect(formatGrantTimestamp('2026-09-01T09:12:34.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
    );
  });

  it('renders an unparseable value verbatim rather than a fabricated date', () => {
    expect(formatGrantTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('toPlatformRoleGrantRow', () => {
  it('carries the grant verbatim and resolves both identities', () => {
    const row = toPlatformRoleGrantRow(grant(), profiles, 'person_other');

    expect(row.id).toBe('grant_1');
    expect(row.role).toBe('lightbridge-admin');
    expect(row.reason).toBe('On-call operator.');
    expect(row.user).toEqual({ kind: 'user', name: 'Ada Nkemdirim', email: 'ada@example.com' });
    expect(row.grantedBy).toEqual({ kind: 'user', name: 'Stephane Segning' });
    expect(row.revokedAt).toBeUndefined();
  });

  // Keyed on the PERSON (`users.id`), which is what `platform_role_grants.user_id` holds — never
  // on the account subject, which would match nothing (ADR-0026: one person, many accounts).
  it('marks the caller’s own grant, and only theirs', () => {
    expect(toPlatformRoleGrantRow(grant(), profiles, 'person_ada').isSelf).toBe(true);
    expect(toPlatformRoleGrantRow(grant(), profiles, 'person_steph').isSelf).toBe(false);
  });

  it('never marks a grant as the caller’s own when the caller id is unknown', () => {
    // `''` is what an unverified `getMyAccess` leaves behind. It must not accidentally match a
    // grant, and it must not suppress the warning for a real match either — it simply cannot know.
    expect(toPlatformRoleGrantRow(grant({ userId: '' }), profiles, '').isSelf).toBe(false);
  });

  it('surfaces a revocation timestamp only when the grant is actually revoked', () => {
    const row = toPlatformRoleGrantRow(
      grant({ revokedAt: '2026-08-30T17:44:00.000Z' }),
      profiles,
      'x'
    );
    expect(row.revokedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('leaves an absent reason absent rather than inventing one', () => {
    expect(toPlatformRoleGrantRow(grant({ reason: null }), profiles, 'x').reason).toBeUndefined();
  });
});
