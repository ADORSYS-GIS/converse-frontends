import { describe, expect, it } from 'vitest';

import type { SessionResponse } from '../shared/session-response';
import { scopeProjectsForAccount } from '../client/use-console-scope';
import { apiKeysAccountFilters } from './api-key-rows';
import { isHomeAccount, isOwnedAccountId } from './account-ownership';
import { activeApiKeysCountFilters } from './overview-usage';

/**
 * IA v3 Phase 2d — the account-scoping audit (converse-frontends#368/#392).
 *
 * Owner-observed defect, live: routes moved under `/accounts/[accountId]/*` (phase 1), but
 * several data paths kept fetching IDENTITY-wide — `/accounts/A/api-keys` and
 * `/accounts/B/api-keys` rendered the SAME key list, and the create-key dialog offered projects
 * from ALL of the identity's accounts, not just the one in the path.
 *
 * This file is the audit's own trail: one place asserting, for every fixed surface, that (a) two
 * different accountIds produce genuinely different filters/option lists, and (b) an account with
 * no known project ids yet never falls back to an unscoped "match everything" query. The deeper
 * per-function coverage lives beside each module (`api-key-rows.test.ts`, `overview-usage.test.ts`,
 * `account-ownership.test.ts`, `client/use-console-scope.test.ts`) — this file exists so the CLASS
 * of defect (not just one instance of it) has one grep-able home.
 *
 * Root cause, for each fixed surface:
 *  - `scope.projects` (`use-console-scope.ts`) was `projectsQuery.result.data` verbatim — every
 *    project the identity can read, unfiltered by account. Fixed by `scopeProjectsForAccount`.
 *  - `apiKeys` list/count queries (`use-api-keys-screen.ts`, `use-overview-screen.ts`) sent NO
 *    filter at all once the toolbar's project filter was "All projects", because `ApiKey` carries
 *    `projectId`, never `accountId` (`authz.cstack:393-431`). Fixed by `apiKeysAccountFilters`
 *    (`projectId in […]` over the account's own project ids).
 *  - Budget balance/refill ladder (`getMyBudgetBalance`/`getMyBudgetRefillLadder`) structurally
 *    answer for the caller's HOME account only — no target-account argument exists on either
 *    procedure. Fixed by gating both behind `isHomeAccount` and rendering an honest
 *    `BudgetSummaryUnwired` gap for any other scoped account, rather than silently showing the
 *    home account's numbers under a different account's label.
 */

const SUB = 'auth0|9f3a2c7e41b0';
function session(sub: string | null = SUB): SessionResponse {
  return { authenticated: sub !== null, user: sub === null ? null : { sub, roles: [] }, isAdmin: false };
}

describe('account-scoping audit — projects option list', () => {
  const allProjects = [
    { id: 'proj_a1', name: 'gateway-prod', accountId: 'acct_a' },
    { id: 'proj_a2', name: 'gateway-edge', accountId: 'acct_a' },
    { id: 'proj_b1', name: 'support-copilot', accountId: 'acct_b' },
  ];

  it('the create-key dialog’s project options (scope.projects) never cross an account boundary', () => {
    const optionsForA = scopeProjectsForAccount(allProjects, 'acct_a').map((p) => p.id);
    const optionsForB = scopeProjectsForAccount(allProjects, 'acct_b').map((p) => p.id);

    expect(optionsForA).toEqual(['proj_a1', 'proj_a2']);
    expect(optionsForB).toEqual(['proj_b1']);
    expect(optionsForA).not.toEqual(optionsForB);
  });
});

describe('account-scoping audit — apiKeys list/count queries', () => {
  it('/accounts/A/api-keys and /accounts/B/api-keys resolve to different filters, never the same list', () => {
    const filtersForA = apiKeysAccountFilters({ projectId: null, accountProjectIds: ['proj_a1'] });
    const filtersForB = apiKeysAccountFilters({ projectId: null, accountProjectIds: ['proj_b1'] });

    expect(filtersForA).not.toEqual(filtersForB);
  });

  it('the "Active API keys" stat card agrees with the ledger’s own account scoping', () => {
    // Both `use-api-keys-screen.ts` (the ledger) and `use-overview-screen.ts` (the stat card) go
    // through the SAME `apiKeysAccountFilters` builder — `activeApiKeysCountFilters` layers only
    // the `status eq active` clause on top, so the two can never disagree about which projects
    // belong to the scoped account.
    const ledgerFilters = apiKeysAccountFilters({ projectId: null, accountProjectIds: ['proj_a1'] });
    const statCardFilters = activeApiKeysCountFilters(null, ['proj_a1']);

    expect(statCardFilters).toEqual([...(ledgerFilters ?? []), { field: 'status', operator: 'eq', value: 'active' }]);
  });

  it('never falls back to an unscoped fetch when the account’s own project ids are not known yet', () => {
    expect(apiKeysAccountFilters({ projectId: null, accountProjectIds: [] })).toBeNull();
    expect(activeApiKeysCountFilters(null, [])).toBeNull();
  });
});

describe('account-scoping audit — budget balance/refill is home-account-only, and says so', () => {
  const HOME_ACCOUNT = { id: SUB, userId: SUB };
  const SECOND_OWNED_ACCOUNT = { id: 'cuid2_second_account', userId: SUB };
  const allAccounts = [HOME_ACCOUNT, SECOND_OWNED_ACCOUNT];

  it('the home account is queryable — getMyBudgetBalance/getMyBudgetRefillLadder answer for it', () => {
    expect(isHomeAccount(HOME_ACCOUNT.id, session())).toBe(true);
  });

  it('a second, genuinely OWNED account is still not the home account — the real gap this audit surfaces', () => {
    // This is the crux of the backend gap: ownership alone (`isOwnedAccountId`) is not enough to
    // read this account's own budget balance — only the home account can be read via the
    // `budget:read-own` self-service procedures.
    expect(isOwnedAccountId(SECOND_OWNED_ACCOUNT.id, allAccounts, session())).toBe(true);
    expect(isHomeAccount(SECOND_OWNED_ACCOUNT.id, session())).toBe(false);
  });
});
