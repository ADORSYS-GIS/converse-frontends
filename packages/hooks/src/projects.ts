import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lightbridge/i18n';
import type { JsonValue, Project, UpdateProjectInput } from '@lightbridge/authz-rpc';
import {
  createId,
  createProject,
  deleteProject,
  disableProject,
  enableProject,
  listProjects,
  updateProject,
} from '@lightbridge/authz-rpc';
import { useCurrentAccount } from './accounts';
import { useAuthSession } from './auth-session';

export function projectsQueryKey(accountId: string) {
  return ['accounts', accountId, 'projects'] as const;
}

/** Caller-facing subset of `CreateProjectInput` — the server-managed `id`/`defaultLimits`/`status` are filled in here. */
export type CreateProjectFields = {
  name: string;
  billingPlan: string;
  allowedModels?: JsonValue;
};

function buildCreateProjectInput(accountId: string, fields: CreateProjectFields) {
  return {
    id: createId(),
    accountId,
    name: fields.name,
    allowedModels: fields.allowedModels,
    defaultLimits: {},
    billingPlan: fields.billingPlan,
    status: 'active',
  };
}

async function listProjectsForAccount(accountId: string): Promise<Project[]> {
  return listProjects({ limit: 10, offset: 0, filters: [{ key: 'accountId', value: accountId }] });
}

export function useProjects(accountId?: string) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: accountId ? projectsQueryKey(accountId) : ['projects', 'unknown'],
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      return listProjectsForAccount(accountId);
    },
    enabled: !!accountId && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<Project[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentProject(enabled = true) {
  const { isAuthenticated } = useAuthSession();
  const { data: currentAccount, isLoading: isAccountLoading } = useCurrentAccount(enabled);
  const accountId = currentAccount?.id;

  const { data: projects, ...query } = useProjects(accountId);

  const current = useMemo<Project | undefined>(() => {
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
    mutationFn: async ({ accountId, input }: { accountId: string; input: CreateProjectFields }) =>
      createProject(buildCreateProjectInput(accountId, input)),
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
      input: UpdateProjectInput;
    }) => updateProject(id, input),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useDisableProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      disableProject({ projectId: id }),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useEnableProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      enableProject({ projectId: id }),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) => deleteProject(id),
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
      const existing = await listProjectsForAccount(accountId);

      if (existing.length > 0) {
        return existing[0];
      }

      const created = await createProject(
        buildCreateProjectInput(accountId, { name: t('project.defaultName'), billingPlan: 'free' })
      );

      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
      return created;
    },
  });

  return {
    ...mutation,
    mutate: mutation.mutateAsync,
  };
}
