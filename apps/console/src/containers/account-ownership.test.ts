import { describe, expect, it } from 'vitest';

import type { SessionResponse } from '../shared/session-response';
import { isAccountOwner, isHomeAccount, isOwnedAccountId } from './account-ownership';

const SUB = 'auth0|9f3a2c7e41b0';

function session(sub: string | null = SUB): SessionResponse {
  return {
    authenticated: sub !== null,
    user: sub === null ? null : { sub, platformUserId: sub, roles: [] },
    permissions: [],
    accessVerified: true,
  };
}

// The three shapes ADR-0026 (lightbridge-authz#564) actually produces, exercised together so a
// regression that special-cases one of them (e.g. reverting to the pre-ADR-0026 `id === sub`
// shortcut) fails on the OTHER two, not just the one a narrower test happened to cover:
//
//  - the HOME account: `id === userId === sub` (every account that predates the ADR, and every
//    identity's first account since).
//  - a SECOND owned account: minted `id`, but `userId` still the owner's home-account id.
//  - a MEMBER (not owned) account: some other identity's `userId` entirely — visible to this
//    caller only through `ProjectMember`, never through `Account`'s own owner-only `@@allow`.
const HOME_ACCOUNT = { id: SUB, userId: SUB };
const SECOND_OWNED_ACCOUNT = { id: 'cuid2_second_account', userId: SUB };
const OTHER_IDENTITYS_ACCOUNT = { id: 'cuid2_someone_elses', userId: 'auth0|someone-else' };

describe('isAccountOwner', () => {
  it('owns the home account — id, userId and sub all agree', () => {
    expect(isAccountOwner(HOME_ACCOUNT, session())).toBe(true);
  });

  it('owns a second account too — userId matches even though id does not', () => {
    expect(isAccountOwner(SECOND_OWNED_ACCOUNT, session())).toBe(true);
  });

  it('does not own another identity’s account', () => {
    expect(isAccountOwner(OTHER_IDENTITYS_ACCOUNT, session())).toBe(false);
  });

  it('owns nothing when signed out', () => {
    expect(isAccountOwner(HOME_ACCOUNT, session(null))).toBe(false);
  });

  it('owns nothing when there is no account to check', () => {
    expect(isAccountOwner(null, session())).toBe(false);
    expect(isAccountOwner(undefined, session())).toBe(false);
  });
});

describe('isOwnedAccountId', () => {
  const allAccounts = [HOME_ACCOUNT, SECOND_OWNED_ACCOUNT];

  it('resolves an owned id — home account', () => {
    expect(isOwnedAccountId(HOME_ACCOUNT.id, allAccounts, session())).toBe(true);
  });

  it('resolves an owned id — second account, whose id is not the sub', () => {
    expect(isOwnedAccountId(SECOND_OWNED_ACCOUNT.id, allAccounts, session())).toBe(true);
  });

  it('is false for an id not present in the resolvable list at all', () => {
    // The realistic shape this takes in the app: `allAccounts` (`useConsoleScope`) already comes
    // back backend-filtered to owned accounts only, so an id absent from it is never one this
    // caller owns — a member-only or otherwise unreadable account included here purely to pin
    // that "not found" and "found but not mine" both resolve to `false`.
    expect(isOwnedAccountId(OTHER_IDENTITYS_ACCOUNT.id, allAccounts, session())).toBe(false);
  });

  it('is false for an empty scoped id', () => {
    expect(isOwnedAccountId('', allAccounts, session())).toBe(false);
  });
});

// Phase 2d (account-scoping audit, converse-frontends#368/#392): `isHomeAccount` is deliberately
// NARROWER than `isAccountOwner` above — a second owned account passes ownership but must still
// read `false` here, because that is exactly the distinction the budget domain's self-service
// procedures (`getMyBudgetBalance`/`getMyBudgetRefillLadder`) draw: they answer for `auth().id`
// only, never for any other account the same identity happens to own.
describe('isHomeAccount', () => {
  it('is the home account — id equals the JWT subject', () => {
    expect(isHomeAccount(HOME_ACCOUNT.id, session())).toBe(true);
  });

  it('is NOT the home account for a second, owned account — ownership is not enough', () => {
    expect(isHomeAccount(SECOND_OWNED_ACCOUNT.id, session())).toBe(false);
  });

  it('is not the home account for another identity’s account', () => {
    expect(isHomeAccount(OTHER_IDENTITYS_ACCOUNT.id, session())).toBe(false);
  });

  it('is false when signed out', () => {
    expect(isHomeAccount(HOME_ACCOUNT.id, session(null))).toBe(false);
  });
});
