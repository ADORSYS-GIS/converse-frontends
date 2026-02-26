import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiKeyBackendProject } from '@lightbridge/api-rest';
import { apiKeyBackendListProjects } from '@lightbridge/api-rest';
import { useCurrentAccount } from './accounts';

export function projectsQueryKey(accountId: string) {
  return ['accounts', accountId, 'projects'] as const;
}

export function useProjects(accountId?: string) {
  const query = useQuery({
    queryKey: accountId ? projectsQueryKey(accountId) : ['projects', 'unknown'],
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      const response = await apiKeyBackendListProjects<true>({ path: { account_id: accountId } });
      return response.data;
    },
    enabled: !!accountId,
  });

  const items = useMemo<ApiKeyBackendProject[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentProject() {
  const { data: currentAccount, isLoading: isAccountLoading } = useCurrentAccount();
  const accountId = currentAccount?.id;

  const { data: projects, ...query } = useProjects(accountId);

  const current = useMemo<ApiKeyBackendProject | undefined>(() => {
    return projects && projects.length > 0 ? projects[0] : undefined;
  }, [projects]);

  return {
    ...query,
    data: current,
    isLoading: isAccountLoading || query.isLoading,
  };
}
