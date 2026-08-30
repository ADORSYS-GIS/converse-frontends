'use client';

import type { Account, Project } from '@lightbridge/authz-rpc';
import type { ScopeOption, ScopeProjectOption, ScopeSelectValue } from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { accountScopeLabel } from '../containers/account-label';
import { readLastAccountId } from '../containers/use-account-resolver';
import { useProjectScopeParams } from './url-state';

/**
 * The account/project scope every screen filters by: the **path** for the account, the **URL
 * query** for the project, refine for the option lists.
 *
 * ADR 0011 Decision 2 makes this a plain hook again. It used to be a hook, then had to be hoisted
 * into a layout-level context once the shell split into a centre and two parallel-route slots —
 * three separate React subtrees that all read and write the same scope, which a hook called three
 * times would have given three independent copies of. The query string (and, since IA v3 phase 1,
 * the route itself) is above all three by construction, so the context (`ConsoleScopeProvider`) is
 * gone and every zone simply calls this.
 *
 * It also gets the property the context never had: scope is now shareable and reload-stable.
 * `/accounts/acct_1/api-keys?project=proj_7` opens for a colleague on exactly the rows the sender
 * was looking at, and Back returns to the previously-scoped project.
 *
 * **The account prefers the path, and is never written back.** Under `/accounts/[accountId]/*`
 * the path segment IS the account — `use-account-id.ts`'s `useAccountId()` throws if it's ever
 * missing there, and this hook always agrees with it exactly (see the guard below). Off that path
 * — the sidebar's Operator nav count, the four dialog controllers, and `/settings/*`'s own screens
 * all still mount alongside `app/(console)/layout.tsx` (never inside `/accounts/*`) and still need
 * *a* current account — this hook falls back to the first loaded account, same as the *whole*
 * hook did before this phase. That fallback is deliberately NOT deleted outright, only demoted to
 * a fallback: the ONE thing IA v3 phase 1 moves out of it is the REDIRECT decision (which account
 * a bare `/` lands a visitor on, including the `lightbridge.last-account` preference) — that now
 * happens exactly once, at `/`'s own resolver (`app/(console)/page.tsx`). Neither half is ever
 * written back into a URL param (ADR 0011 Decision 5). **The empty project is still resolved,
 * never written**: `?project=` absent means "every project in this account," the parser's own
 * default, kept out of the URL by `clearOnDefault`.
 */
export type ConsoleScope = {
  value: ScopeSelectValue;
  setValue: (value: ScopeSelectValue) => void;
  accounts: ScopeOption[];
  projects: ScopeProjectOption[];
  /** Every account row as the backend returned it — `ScopeOption` above flattens each to an
   *  `{id, label}` pair, which loses the `name === null` vs `name === '<something>'` distinction
   *  `AccountPanel` is built around. `use-projects-screen.ts` needs the unflattened rows. */
  allAccounts: Account[];
  /** Every project, unfiltered by the selected account — the Projects ledger needs the full set. */
  allProjects: Project[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
};

const SCOPE_PAGE_SIZE = 100;

export function useConsoleScope(): ConsoleScope {
  // Not the throwing `useAccountId()`: this hook is also called from route branches that have no
  // `[accountId]` segment at all (see the doc comment above), and must degrade gracefully there
  // rather than crash the whole shell. `useAccountId()` stays reserved for call sites that can
  // assert they are always inside `/accounts/[accountId]/*`.
  const routeParams = useParams<{ accountId?: string }>();
  const pathAccountId = routeParams?.accountId;
  const [params, setParams] = useProjectScopeParams();

  const accountsQuery = useList<Account>({
    resource: 'accounts',
    pagination: { currentPage: 1, pageSize: SCOPE_PAGE_SIZE },
  });
  const projectsQuery = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: SCOPE_PAGE_SIZE },
  });

  const accounts = useMemo<ScopeOption[]>(
    () =>
      accountsQuery.result.data.map((account) => ({
        id: account.id,
        // Never the bare id: `accountScopeLabel` renders a real name as itself and an unnamed
        // account as a named absence that still carries its id (see that function's own comment).
        label: accountScopeLabel(account),
      })),
    [accountsQuery.result.data]
  );

  const projects = useMemo<ScopeProjectOption[]>(
    () =>
      projectsQuery.result.data.map((project) => ({
        id: project.id,
        label: project.name,
        accountId: project.accountId,
      })),
    [projectsQuery.result.data]
  );

  // `''` is the parser default (and therefore absent from the URL); `ScopeSelect` speaks `null`
  // for "all projects", so the two vocabularies are bridged here rather than in every caller.
  // The path segment wins whenever it's present. Off `/accounts/*`, the fallback tries the
  // remembered `lightbridge.last-account` preference before "first account" — the same order
  // `use-account-resolver.ts`'s `/` resolver uses, so the sidebar's nav hrefs (`console-chrome.tsx`
  // — rendered on `/` and `/settings/*` too, where there is no path segment to read) point at
  // whichever account the visitor was actually last using, not an arbitrary one.
  const lastAccountId = accounts.length > 0 ? readLastAccountId() : null;
  const rememberedAccount = lastAccountId
    ? accounts.find((account) => account.id === lastAccountId)
    : undefined;
  const resolvedAccountId = pathAccountId || rememberedAccount?.id || accounts[0]?.id || '';
  const value: ScopeSelectValue = {
    accountId: resolvedAccountId,
    projectId: params.projectId || null,
  };

  return {
    value,
    // Only the project half is ever written here: the account half is a path segment, not a URL
    // param, so there is nothing for a `setValue` call to write it INTO. A caller that still
    // passes a different `accountId` (`ScopeSelect`'s combined account+project control, used by
    // the report-export panels) has that half silently ignored — switching account is the
    // workspace switcher's job now (`console-chrome.tsx`'s `onSelectAccount`, which navigates to
    // the same screen under the new account), not this hook's.
    setValue: (next) => {
      void setParams({ projectId: next.projectId ?? '' });
    },
    accounts,
    projects,
    allAccounts: accountsQuery.result.data,
    allProjects: projectsQuery.result.data,
    loading: accountsQuery.query.isLoading || projectsQuery.query.isLoading,
    error: accountsQuery.query.isError || projectsQuery.query.isError,
    refetch: () => {
      void accountsQuery.query.refetch();
      void projectsQuery.query.refetch();
    },
  };
}
