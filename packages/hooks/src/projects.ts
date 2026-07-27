import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lightbridge/i18n';
import type {
  JsonValue,
  Project as GeneratedProject,
  UpdateProjectInput,
} from '@lightbridge/authz-rpc';
import { createId, getAuthzRpcClient, tagValue, untagValue } from '@lightbridge/authz-rpc';
import type { Project } from './authz-types';
import { useCurrentAccount } from './accounts';
import { useAuthSession } from './auth-session';

export function projectsQueryKey(accountId: string) {
  return ['accounts', accountId, 'projects'] as const;
}

/** Caller-facing subset of `CreateProjectInput` — the server-managed `id`/`defaultLimits`/`status` are filled in here. */
export type CreateProjectFields = {
  name: string;
  billingPlan: string;
  /**
   * Who is paying for this project. Moved here from the account by lightbridge-authz ADR-0006 —
   * one account can now bill projects to different parties. Server-side it is `@unique`, so it
   * must be distinguishable per project, not merely per person.
   */
  billingIdentity: string;
  allowedModels?: JsonValue;
  /** Pooled spending ceiling for everyone on the project, drawn from the governance tier catalogue. */
  projectQuota?: string;
};

function buildCreateProjectInput(accountId: string, fields: CreateProjectFields) {
  return {
    id: createId(),
    accountId,
    name: fields.name,
    allowedModels: fields.allowedModels,
    defaultLimits: {},
    billingPlan: fields.billingPlan,
    billingIdentity: fields.billingIdentity,
    projectQuota: fields.projectQuota,
    status: 'active',
    // `isDefault` is `@readonly` server-side (set by the `projects_set_is_default` trigger — true
    // only for an account's first-ever project) but, unlike the Rust codegen, the TS generator
    // doesn't drop `@readonly` fields from `CreateProjectInput`, so it must still be supplied here.
    // Any caller-supplied value is ignored server-side, same as `status` above.
    isDefault: false,
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
  return {
    ...project,
    allowedModels:
      project.allowedModels === undefined || project.allowedModels === null
        ? project.allowedModels
        : untagValue(project.allowedModels),
    defaultLimits:
      project.defaultLimits === undefined || project.defaultLimits === null
        ? project.defaultLimits
        : untagValue(project.defaultLimits),
  };
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

export function useSetDefaultProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; accountId: string }) =>
      untagProject(
        await getAuthzRpcClient().procedures.setDefaultProject({ args: { projectId: id } })
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

/**
 * Project roster (lightbridge-authz ADR-0006). A project groups people working toward a shared
 * goal; each `ProjectMember` row is `{project, account, role: lead|member, quotaTier}`.
 *
 * Two things to know before using these:
 *
 * 1. An account's DEFAULT project has no roster by construction — nothing ever inserts a member row
 *    for it ("you, working alone"). Rendering a roster UI for a default project will correctly show
 *    nothing, so gate on `project.isDefault` rather than treating empty as an error.
 * 2. All four mutations are lead-gated server-side: the caller must own the project's account or
 *    hold `role: 'lead'`. A member who is not a lead gets a `403`; a non-member gets a `404`. The
 *    coarse `project:member` permission is necessary but not sufficient — do not use `has()` alone
 *    to decide whether to show these controls as enabled.
 */
export function projectMembersQueryKey(projectId: string) {
  return ['projects', projectId, 'members'] as const;
}

export function useProjectMembers(projectId: string | undefined, enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: projectMembersQueryKey(projectId ?? ''),
    queryFn: async () => {
      const page = await getAuthzRpcClient().projectMembers.list({
        limit: 50,
        offset: 0,
        filters: [{ key: 'projectId', value: projectId as string }],
      });
      return page.items;
    },
    enabled: enabled && isAuthenticated && Boolean(projectId),
    staleTime: 5 * 60_000,
  });

  return { ...query, data: query.data ?? [] };
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      accountId,
      role,
    }: {
      projectId: string;
      accountId: string;
      role?: 'lead' | 'member';
    }) =>
      untagProject(
        await getAuthzRpcClient().procedures.addProjectMember({
          args: { projectId, accountId, role },
        })
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(projectId) });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ projectId, accountId }: { projectId: string; accountId: string }) =>
      untagProject(
        await getAuthzRpcClient().procedures.removeProjectMember({
          args: { projectId, accountId },
        })
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(projectId) });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useSetProjectMemberRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      accountId,
      role,
    }: {
      projectId: string;
      accountId: string;
      role: 'lead' | 'member';
    }) =>
      untagProject(
        await getAuthzRpcClient().procedures.setProjectMemberRole({
          args: { projectId, accountId, role },
        })
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(projectId) });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useSetProjectMemberQuotaTier() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      accountId,
      quotaTier,
    }: {
      projectId: string;
      accountId: string;
      quotaTier?: string;
    }) =>
      untagProject(
        await getAuthzRpcClient().procedures.setProjectMemberQuotaTier({
          args: { projectId, accountId, quotaTier },
        })
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(projectId) });
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
  const { session } = useAuthSession();

  const mutation = useMutation({
    mutationFn: async (accountId: string) => {
      const existing = await listProjectsForAccount(accountId);

      if (existing.length > 0) {
        return existing[0];
      }

      // The billing identity the account used to carry now belongs to the project (ADR-0006), and
      // it is `@unique` server-side. For the auto-provisioned default project the person is the
      // payer, so their own identifier is the right value — the same expression that used to be
      // passed to createAccount. Suffixed with the account id so a second person bootstrapping
      // with the same email-less fallback cannot collide.
      const payer = session.user?.email ?? session.user?.name ?? session.user?.id;
      if (!payer) {
        throw new Error('User session is required to create a default project');
      }

      const created = await getAuthzRpcClient().projects.create(
        tagProjectJsonFields(
          buildCreateProjectInput(accountId, {
            name: t('project.defaultName'),
            billingPlan: 'free',
            billingIdentity: payer,
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
