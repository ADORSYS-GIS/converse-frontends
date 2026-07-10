import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lightbridge/i18n';
import type {
  ApiKeyBackendCreateProject,
  ApiKeyBackendProject,
  ApiKeyBackendUpdateProject,
} from '@lightbridge/api-rest';
import {
  apiKeyBackendCreateProject,
  apiKeyBackendDeleteProject,
  apiKeyBackendListProjects,
  apiKeyBackendUpdateProject,
} from '@lightbridge/api-rest';
import { useCurrentAccount } from './accounts';
import { useAuthSession } from './auth-session';

export function projectsQueryKey(accountId: string) {
  return ['accounts', accountId, 'projects'] as const;
}

export function useProjects(accountId?: string) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: accountId ? projectsQueryKey(accountId) : ['projects', 'unknown'],
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      const response = await apiKeyBackendListProjects<true>({
        path: { account_id: accountId, limit: 10, offset: 0 },
      });
      return response.data;
    },
    enabled: !!accountId && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<ApiKeyBackendProject[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentProject(enabled = true) {
  const { isAuthenticated } = useAuthSession();
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
    enabled: enabled && !!accountId && isAuthenticated,
  };
}
export function useCreateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      accountId,
      input,
    }: {
      accountId: string;
      input: ApiKeyBackendCreateProject;
    }) => {
      const response = await apiKeyBackendCreateProject<true>({
        path: { account_id: accountId },
        body: input,
      });
      return response.data;
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      accountId: string;
      input: ApiKeyBackendUpdateProject;
    }) => {
      const response = await apiKeyBackendUpdateProject<true>({
        path: { project_id: id },
        body: input,
      });
      return response.data;
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      apiKeyBackendDeleteProject({ path: { project_id: id } }),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useEnsureDefaultProject() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: async (accountId: string) => {
      const projectsResponse = await apiKeyBackendListProjects<true>({
        path: { account_id: accountId, limit: 10, offset: 0 },
      });
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
