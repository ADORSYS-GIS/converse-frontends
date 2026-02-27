import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ApiKeyBackendProject } from '@lightbridge/api-rest';
import { apiKeyBackendCreateProject, apiKeyBackendListProjects } from '@lightbridge/api-rest';
import { useCurrentAccount } from './accounts';
import { useAuthReady } from './auth-session';

export function projectsQueryKey(accountId: string) {
  return ['accounts', accountId, 'projects'] as const;
}

export function useProjects(accountId?: string) {
  const authReady = useAuthReady();

  const query = useQuery({
    queryKey: accountId ? projectsQueryKey(accountId) : ['projects', 'unknown'],
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      const response = await apiKeyBackendListProjects<true>({ path: { account_id: accountId } });
      return response.data;
    },
    enabled: !!accountId && authReady,
  });

  const items = useMemo<ApiKeyBackendProject[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentProject(enabled = true) {
  const { data: currentAccount, isLoading: isAccountLoading } = useCurrentAccount(enabled);
  const accountId = currentAccount?.id;

  const { data: projects, ...query } = useProjects(accountId);

  const current = useMemo<ApiKeyBackendProject | undefined>(() => {
    return projects && projects.length > 0 ? projects[0] : undefined;
  }, [projects]);

  return {
    ...query,
    data: current,
    isLoading: isAccountLoading || query.isLoading,
    enabled: enabled && !!accountId,
  };
}
export function useEnsureDefaultProject() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: async (accountId: string) => {
      const projectsResponse = await apiKeyBackendListProjects<true>({ path: { account_id: accountId } });
      const existing = projectsResponse.data;

      if (existing && existing.length > 0) {
        return existing[0];
      }

      const createResponse = await apiKeyBackendCreateProject<true>({
        path: { account_id: accountId },
        body: {
          name: t('project.defaultName'),
          billing_plan: 'free',
        },
      });

      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
      return createResponse.data;
    },
  });

  return {
    ...mutation,
    mutate: mutation.mutateAsync,
  };
}
