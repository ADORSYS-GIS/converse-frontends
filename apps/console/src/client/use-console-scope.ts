'use client';

import type { Account, Project } from '@lightbridge/authz-rpc';
import type { ScopeOption, ScopeProjectOption, ScopeSelectValue } from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo, useState } from 'react';

/**
 * The account/project scope every screen filters by, loaded through refine over the generated
 * `accounts` and `projects` resources.
 *
 * The scope lives in component state rather than the URL: `syncWithLocation` is off (no
 * `routerProvider` is registered — see `console-providers.tsx`), so putting it in the query string
 * would be a second, unsynchronised source of truth.
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
  const [value, setValue] = useState<ScopeSelectValue>({ accountId: '', projectId: null });

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

  // The first account becomes the scope once it arrives; the user's own choice always wins after.
  const resolved: ScopeSelectValue =
    value.accountId || accounts.length === 0
      ? value
      : { accountId: accounts[0].id, projectId: null };

  return {
    value: resolved,
    setValue,
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
