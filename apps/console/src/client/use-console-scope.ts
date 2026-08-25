'use client';

import type { Account, Project } from '@lightbridge/authz-rpc';
import type { ScopeOption, ScopeProjectOption, ScopeSelectValue } from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo } from 'react';

import { useScopeParams } from './url-state';

/**
 * The account/project scope every screen filters by: the **URL** for the selection, refine for the
 * option lists.
 *
 * ADR 0011 Decision 2 makes this a plain hook again. It used to be a hook, then had to be hoisted
 * into a layout-level context once the shell split into a centre and two parallel-route slots —
 * three separate React subtrees that all read and write the same scope, which a hook called three
 * times would have given three independent copies of. The query string is above all three by
 * construction, so the context (`ConsoleScopeProvider`) is gone and every zone simply calls this.
 *
 * It also gets the property the context never had: scope is now shareable and reload-stable.
 * `/api-keys?account=acct_1&project=proj_7` opens for a colleague on exactly the rows the sender
 * was looking at, and Back returns to the previously-scoped view.
 *
 * **The empty account is resolved, never written.** `?account=` absent means "whichever account
 * the data hands me first", resolved here from the loaded list. Writing that resolution back into
 * the URL would put a default in the URL (ADR 0011 Decision 5) and pin every shared link to the
 * sender's first account; leaving it derived keeps a bare `/api-keys` meaning the same thing for
 * everyone.
 */
export type ConsoleScope = {
  value: ScopeSelectValue;
  setValue: (value: ScopeSelectValue) => void;
  accounts: ScopeOption[];
  projects: ScopeProjectOption[];
  /** Every project, unfiltered by the selected account — the Manage ledger needs the full set. */
  allProjects: Project[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
};

const SCOPE_PAGE_SIZE = 100;

export function useConsoleScope(): ConsoleScope {
  const [params, setParams] = useScopeParams();

  const accountsQuery = useList<Account>({
    resource: 'accounts',
    pagination: { currentPage: 1, pageSize: SCOPE_PAGE_SIZE },
  });
  const projectsQuery = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: SCOPE_PAGE_SIZE },
  });

  const accounts = useMemo<ScopeOption[]>(
    () => accountsQuery.result.data.map((account) => ({ id: account.id, label: account.id })),
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
  const fromUrl: ScopeSelectValue = {
    accountId: params.accountId,
    projectId: params.projectId || null,
  };

  // The first account becomes the scope once it arrives; the URL's own choice always wins after.
  const resolved: ScopeSelectValue =
    fromUrl.accountId || accounts.length === 0
      ? fromUrl
      : { accountId: accounts[0].id, projectId: null };

  return {
    value: resolved,
    setValue: (next) => {
      void setParams({ accountId: next.accountId, projectId: next.projectId ?? '' });
    },
    accounts,
    projects,
    allProjects: projectsQuery.result.data,
    loading: accountsQuery.query.isLoading || projectsQuery.query.isLoading,
    error: accountsQuery.query.isError || projectsQuery.query.isError,
    refetch: () => {
      void accountsQuery.query.refetch();
      void projectsQuery.query.refetch();
    },
  };
}
