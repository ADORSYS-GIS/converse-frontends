import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lightbridge/i18n';
import type {
  JsonValue,
  Project as GeneratedProject,
  UpdateProjectInput,
} from '@lightbridge/authz-rpc';
import { createId, getAuthzRpcClient, tagValue, untagValue } from '@lightbridge/authz-rpc';
import { asFull, type Project } from './authz-types';
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

/**
 * The generated client passes `allowedModels`/`defaultLimits` through untouched — it doesn't know
 * about cratestack's externally-tagged `Value` wire shape for `Json` columns. Tag on the way out,
 * untag on the way back in, so everything above this module deals in plain JS values.
 */
function tagProjectJsonFields<T extends { allowedModels?: JsonValue; defaultLimits?: JsonValue }>(
  input: T
): T {
  return {
    ...input,
    allowedModels: input.allowedModels === undefined ? undefined : tagValue(input.allowedModels),
    defaultLimits: input.defaultLimits === undefined ? undefined : tagValue(input.defaultLimits),
  } as unknown as T;
}

function untagProject(project: GeneratedProject): Project {
  return asFull<Project>({
    ...project,
    allowedModels:
      project.allowedModels === undefined || project.allowedModels === null
        ? project.allowedModels
        : untagValue(project.allowedModels),
    defaultLimits:
      project.defaultLimits === undefined || project.defaultLimits === null
        ? project.defaultLimits
        : untagValue(project.defaultLimits),
  });
}

async function listProjectsForAccount(accountId: string): Promise<Project[]> {
  const page = await getAuthzRpcClient().projects.list({
    limit: 10,
    offset: 0,
    filters: [{ key: 'accountId', value: accountId }],
  });
  return page.items.map(untagProject);
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
    mutationFn: async ({ accountId, input }: { accountId: string; input: CreateProjectFields }) => {
      const created = await getAuthzRpcClient().projects.create(
        tagProjectJsonFields(buildCreateProjectInput(accountId, input))
      );
      return untagProject(created);
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
      input: UpdateProjectInput;
    }) => {
      const updated = await getAuthzRpcClient().projects.update(id, tagProjectJsonFields(input));
      return untagProject(updated);
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

export function useDisableProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      untagProject(
        await getAuthzRpcClient().procedures.disableProject({ args: { projectId: id } })
      ),
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
      untagProject(await getAuthzRpcClient().procedures.enableProject({ args: { projectId: id } })),
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
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      getAuthzRpcClient().projects.delete(id),
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

      const created = await getAuthzRpcClient().projects.create(
        tagProjectJsonFields(
          buildCreateProjectInput(accountId, {
            name: t('project.defaultName'),
            billingPlan: 'free',
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
      return untagProject(created);
    },
  });

  return {
    ...mutation,
    mutate: mutation.mutateAsync,
  };
}
