import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lightbridge/i18n';
import type {
  JsonValue,
  Project as GeneratedProject,
  UpdateProjectInput,
} from '@lightbridge/authz-rpc';
import { createId, getAuthzRpcClient } from '@lightbridge/authz-rpc';
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
 * As of cratestack-cli 0.7.16 (matching the deployed backend's `cratestack`/`cratestack-pg`
 * 0.7.16), `Json` columns are plain, untagged values on the wire — `Value::Deserialize` uses
 * `deserialize_any`, so `{}` stays `{}` and `["x"]` stays `["x"]`. The generated client's
 * `allowedModels`/`defaultLimits` fields are exactly what callers should send/receive; no
 * conversion step is needed. (Earlier revisions of this module hand-tagged these fields —
 * `{"List": [...]}`/`{"Map": {...}}` — to match cratestack-cli 0.4.16's externally-tagged
 * `Value` wire format. That tagging survived the backend's 0.7.11 upgrade to untagged `Value`
 * uncaught, because the untagged decoder accepts any JSON object as `Value::Map` without error,
 * silently defeating the `allowedModels` governance allowlist — see lightbridge-authz#282.)
 */
function toProject(project: GeneratedProject): Project {
  return project;
}

export type UseProjectsOptions = {
  offset?: number;
  limit?: number;
};

/** Applies the default page (offset 0, limit 10 — matches the backend list default). */
export function resolveProjectsOptions(
  options: UseProjectsOptions = {}
): Required<UseProjectsOptions> {
  return { offset: options.offset ?? 0, limit: options.limit ?? 10 };
}

/**
 * Per-page query key — the bare `projectsQueryKey(accountId)` prefix with `{ offset, limit }`
 * appended on top (same pattern as `apiKeysQueryKey` in api-keys.ts). Invalidating with the
 * bare prefix still clears every cached page. Falls back to a stable placeholder key when
 * there is no account yet, matching the query's own `enabled: !!accountId` gate.
 */
export function projectsListQueryKey(
  accountId: string | undefined,
  options: UseProjectsOptions = {}
) {
  return accountId
    ? ([...projectsQueryKey(accountId), resolveProjectsOptions(options)] as const)
    : (['projects', 'unknown'] as const);
}

async function listProjectsForAccount(
  accountId: string,
  options: UseProjectsOptions = {}
): Promise<Project[]> {
  const { offset, limit } = resolveProjectsOptions(options);
  const page = await getAuthzRpcClient().projects.list({
    limit,
    offset,
    filters: [{ key: 'accountId', value: accountId }],
  });
  return page.items.map(toProject);
}

export function useProjects(accountId?: string, options: UseProjectsOptions = {}) {
  const { isAuthenticated } = useAuthSession();

  const { offset, limit } = resolveProjectsOptions(options);

  const query = useQuery({
    queryKey: projectsListQueryKey(accountId, options),
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      return listProjectsForAccount(accountId, { offset, limit });
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
        buildCreateProjectInput(accountId, input)
      );
      return toProject(created);
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
      const updated = await getAuthzRpcClient().projects.update(id, input);
      return toProject(updated);
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
      toProject(await getAuthzRpcClient().procedures.disableProject({ args: { projectId: id } })),
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
      toProject(await getAuthzRpcClient().procedures.enableProject({ args: { projectId: id } })),
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
      toProject(
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
    // `procedures.listProjectRoster`, NOT `projectMembers.list`. The generic model verb cannot
    // work: `model.ProjectMember.*` is fail-closed server-side (403 unconditionally), and the
    // model's `id` is synthetic — `project_members` is keyed `(project_id, account_id)` with no
    // `id` column — so a generated `SELECT id, ...` would reference a column that does not exist.
    // The procedure is the roster's only read path, and it returns the rows directly rather than
    // a `Page`.
    queryFn: async () =>
      getAuthzRpcClient().procedures.listProjectRoster({
        args: { projectId: projectId as string },
      }),
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
      toProject(
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
      toProject(
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
      toProject(
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
      toProject(
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
      // Deliberately called with the default { offset: 0, limit: 10 }, not threaded through
      // UseProjectsOptions: this is an internal "does this account already have a project"
      // existence check (mirrors useEnsureDefaultAccount), not the user-facing project list.
      // It only ever reads `existing[0]`, so a variable offset/limit is meaningless here.
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
        buildCreateProjectInput(accountId, {
          name: t('project.defaultName'),
          billingPlan: 'free',
          billingIdentity: payer,
        })
      );

      queryClient.invalidateQueries({ queryKey: projectsQueryKey(accountId) });
      return toProject(created);
    },
  });

  return {
    ...mutation,
    mutate: mutation.mutateAsync,
  };
}
