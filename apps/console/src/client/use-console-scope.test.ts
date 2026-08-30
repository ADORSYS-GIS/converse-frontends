import { describe, expect, it } from 'vitest';

import { scopeProjectsForAccount } from './use-console-scope';

/**
 * Phase 2d (account-scoping audit, converse-frontends#368/#392) — the owner-observed defect at
 * its root: `useConsoleScope().projects` used to be `projectsQuery.result.data` verbatim, every
 * project the signed-in identity could read across EVERY account it owns, not just the one
 * currently scoped by the path. Every option list built off it (the create-key dialog's project
 * picker, the api-keys/overview toolbar's project select, `ScopeSelect`'s own project popup) was
 * offering projects from accounts the visitor was not even looking at.
 *
 * `scopeProjectsForAccount` is the fix, pulled out of `useConsoleScope` as a plain function so the
 * actual filtering logic is covered without mocking `next/navigation`'s `useParams` or refine's
 * `useList` — see `use-console-scope.ts`'s own doc comment on `projects` vs `allProjects`.
 */
describe('scopeProjectsForAccount', () => {
  const allProjects = [
    { id: 'proj_a1', name: 'gateway-prod', accountId: 'acct_a' },
    { id: 'proj_a2', name: 'gateway-edge', accountId: 'acct_a' },
    { id: 'proj_b1', name: 'support-copilot', accountId: 'acct_b' },
  ];

  it('returns only the scoped account’s own projects', () => {
    expect(scopeProjectsForAccount(allProjects, 'acct_a')).toEqual([
      { id: 'proj_a1', label: 'gateway-prod', accountId: 'acct_a' },
      { id: 'proj_a2', label: 'gateway-edge', accountId: 'acct_a' },
    ]);
  });

  it('two different accountIds produce two genuinely different option lists', () => {
    const accountA = scopeProjectsForAccount(allProjects, 'acct_a');
    const accountB = scopeProjectsForAccount(allProjects, 'acct_b');

    expect(accountA).not.toEqual(accountB);
    expect(accountA.map((p) => p.id)).toEqual(['proj_a1', 'proj_a2']);
    expect(accountB.map((p) => p.id)).toEqual(['proj_b1']);
    // The exact defect this phase closes: account B's projects must never appear in account A's
    // option list, or vice versa.
    expect(accountA.some((p) => p.accountId === 'acct_b')).toBe(false);
    expect(accountB.some((p) => p.accountId === 'acct_a')).toBe(false);
  });

  it('is an empty list, not every project, for an account with none of its own', () => {
    expect(scopeProjectsForAccount(allProjects, 'acct_with_no_projects')).toEqual([]);
  });

  it('is an empty list for an unresolved (empty-string) account id, never the full identity-wide set', () => {
    // `use-console-scope.ts`'s own `resolvedAccountId` default is `''` before any account has
    // loaded — this must never accidentally match a project whose `accountId` happens to be falsy
    // too, or otherwise fall through to "every project."
    expect(scopeProjectsForAccount(allProjects, '')).toEqual([]);
  });
});
