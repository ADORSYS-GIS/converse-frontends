import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@lightbridge/i18n';
import type {
  JsonValue,
  ModelCatalogEntry,
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

/** Query key for the operator-configured model catalogue (`procedure.listModelCatalog`). Not
 * project- or account-scoped -- same rationale as `BILLING_PLANS_QUERY_KEY` in api-keys.ts: it's
 * server config, identical for every caller who can reach it. */
export const MODEL_CATALOG_QUERY_KEY = ['model-catalog'] as const;

/**
 * The operator-configured model catalogue a project's `allowedModels` allowlist may reference,
 * read-only. Mirrors `useBillingPlans` in api-keys.ts exactly -- same `staleTime` reasoning (this
 * is server config, reloaded only on a redeploy), same `enabled` gate so a caller with no use for
 * the catalogue yet (e.g. the allowlist section isn't rendered at all) never fetches it.
 *
 * Exists so the project-settings checkbox UI can build a real multi-select instead of hardcoding
 * a model list client-side -- see https://github.com/ADORSYS-GIS/lightbridge-authz/issues/282,
 * where a hardcoded/mismatched `allowedModels` representation went silently inert for months.
 */
export function useModelCatalog(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  return useQuery<ModelCatalogEntry[]>({
    queryKey: MODEL_CATALOG_QUERY_KEY,
    queryFn: () => getAuthzRpcClient().procedures.listModelCatalog({ args: {} }),
    enabled: isAuthenticated && enabled,
    staleTime: 5 * 60_000,
  });
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
};

function buildCreateProjectInput(accountId: string, fields: CreateProjectFields) {
  return {
    id: createId(),
    accountId,
    name: fields.name,
    defaultLimits: {},
    billingPlan: fields.billingPlan,
    billingIdentity: fields.billingIdentity,
    // `projectQuota` is deliberately absent here, not merely unset: `Project.projectQuota` is
    // `@readonly` server-side (lightbridge-authz#379, completing #177/#375), same pattern as
    // `isDefault`/`modelPolicy` below. The TS generator does not drop `@readonly` fields from
    // `CreateProjectInput` (it stays `projectQuota?: string | null`), so a caller CAN still send
    // it and it silently no-ops -- there is no compile error to catch a stale call site. This
    // hook used to send `fields.projectQuota` through here, but no UI call site (the create-
    // project sheet/view) ever collected or passed one, so it was always `undefined` in practice
    // -- dead, misleading code, not a live bug. Removed rather than wired up; a brand-new project
    // starts with `projectQuota = NULL` and `setProjectQuota` (unwired on the frontend today) is
    // the only real write path, post-creation only. Mirrors `useSetProjectAllowedModels`'s doc
    // comment below for the identical `@readonly`-but-not-dropped shape.
    status: 'active',
    // `isDefault` is `@readonly` server-side (set by the `projects_set_is_default` trigger — true
    // only for an account's first-ever project) but, unlike the Rust codegen, the TS generator
    // doesn't drop `@readonly` fields from `CreateProjectInput`, so it must still be supplied here.
    // Any caller-supplied value is ignored server-side, same as `status` above.
    isDefault: false,
    // Same story as `isDefault`/`status`: `modelPolicy` is `@readonly` (ADR-0018, ships as of the
    // lightbridge-authz#418 schema sync) but still a required, non-`@readonly`-dropped field on
    // the generated `CreateProjectInput`. The server ignores whatever is sent here and every new
    // project's `model_policy` column DEFAULTs to `'allow_all'` at the DB level regardless — this
    // value exists only to satisfy the generated type, matching what the server will actually do.
    modelPolicy: 'allow_all',
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

/** Rows per request while paging through an account's complete project list — see
 *  {@link fetchAllProjectsForAccount}. */
const ALL_PROJECTS_PAGE_SIZE = 50;
/**
 * Safety ceiling on {@link fetchAllProjectsForAccount}'s "keep paging" loop: large enough that no
 * real project list should ever hit it, small enough that a server bug returning
 * `hasNextPage: true` forever cannot turn this into an unbounded fetch loop.
 */
const MAX_PROJECTS_PAGES = 20;

/**
 * Pages through `projects.list` (scoped to one account) until the server reports no more
 * (`pageInfo.hasNextPage: false`), accumulating every item. This is the actual fix for the
 * project-picker truncation bug: the old call sites read `useProjects(accountId)` with no
 * options, which defaults to `resolveProjectsOptions`'s `limit: 10` — an account's 11th project
 * was unreachable and nothing on screen said so. `useAllProjects` below feeds the picker from
 * this instead, so it always has the complete list to select/search over.
 */
export async function fetchAllProjectsForAccount(
  accountId: string
): Promise<{ items: Project[]; totalCount: number }> {
  let items: Project[] = [];
  let offset = 0;
  let totalCount = 0;

  for (let pageIndex = 0; pageIndex < MAX_PROJECTS_PAGES; pageIndex += 1) {
    const page = await getAuthzRpcClient().projects.list({
      limit: ALL_PROJECTS_PAGE_SIZE,
      offset,
      filters: [{ key: 'accountId', value: accountId }],
    });
    items = items.concat(page.items.map(toProject));
    totalCount = page.totalCount ?? items.length;

    if (!page.pageInfo.hasNextPage) {
      return { items, totalCount };
    }
    offset += ALL_PROJECTS_PAGE_SIZE;
  }

  return { items, totalCount };
}

/** Query key for the complete-list fetch — nested under `projectsQueryKey(accountId)` so
 *  invalidating that bare prefix (every mutation below already does) clears this cache too. */
export function allProjectsQueryKey(accountId: string | undefined) {
  return accountId
    ? ([...projectsQueryKey(accountId), 'all'] as const)
    : (['projects', 'unknown', 'all'] as const);
}

/**
 * The complete project list for one account — every page, not just the first. Feeds the project
 * picker (`EntityPickerField` in apps/self-service), which needs to search/select over every
 * project the account has. Prefer `useProjects` for anything that intentionally wants one page
 * (e.g. an existence check).
 */
export function useAllProjects(accountId?: string) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: allProjectsQueryKey(accountId),
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      return fetchAllProjectsForAccount(accountId);
    },
    enabled: !!accountId && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<Project[]>(() => query.data?.items ?? [], [query.data]);
  const totalCount = query.data?.totalCount ?? items.length;

  return { ...query, data: items, totalCount };
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

/**
 * Sets `Project.allowedModels` (lightbridge-authz#415/#417, ADR-0018 Decision 5). `allowedModels`
 * is `@readonly` on `model.Project` as of that change -- neither the generic `model.Project.create`
 * nor `model.Project.update` verb can write it any more, silently: the field is still present
 * (optional) on both generated `Create`/`UpdateProjectInput` types, so a caller sending it through
 * `useUpdateProject` would still typecheck and transmit, but the server drops it without error
 * (same class of silent-no-op the `@readonly` convention already produces elsewhere -- see
 * `buildCreateProjectInput`'s `isDefault`/`status` comment above). This hand-written procedure is
 * now the only write path, so every allowlist edit MUST go through it, never through
 * `useUpdateProject`.
 *
 * Unlike `useUpdateProject`/`useDisableProject`, a rejection here is a real, reachable outcome the
 * caller must render: the server validates every entry against the operator-configured model
 * catalogue (`procedure.listModelCatalog`) and returns a validation error naming the offending
 * id(s), on top of the usual `project:update` permission gate. Exposes `error` for exactly that
 * reason -- swallowing it would recreate the silent-allowlist-inert bug this procedure exists to
 * prevent (lightbridge-authz#282/#283).
 */
export function useSetProjectAllowedModels() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      allowedModels,
    }: {
      projectId: string;
      accountId: string;
      allowedModels: JsonValue | null;
    }) => {
      const updated = await getAuthzRpcClient().procedures.setProjectAllowedModels({
        args: { projectId, allowedModels },
      });
      return toProject(updated);
    },
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
 * ADR-0018's three-value access-control policy on `Project.modelPolicy`. Plain `String` on the
 * wire (the cratestack schema has no enum construct), so every consumer must narrow it itself --
 * this union is the one place that narrowing is spelled out, shared by the write hook below and by
 * the settings UI's fail-closed read-path normalizer.
 */
export type ModelPolicy = 'allow_all' | 'allowlist' | 'deny_all';

/**
 * Sets `Project.modelPolicy` (lightbridge-authz#431, ADR-0018 Decision 5's own follow-up). This is
 * the ONLY write path to that column -- `modelPolicy` is `@readonly` on `model.Project`, exactly
 * like `allowedModels` above, so sending it through `useUpdateProject` would typecheck, transmit,
 * and then be silently dropped by the server.
 *
 * Three contract facts a caller must honour, all from #431 (that PR's schema doc comment records
 * the reasoning; these are the consequences):
 *
 * 1. `modelPolicy` must be exactly `'allow_all' | 'allowlist' | 'deny_all'`. An unrecognized value
 *    is refused with a `BadRequest` naming it, never coerced -- deliberately the opposite of the
 *    READ path's fail-closed coercion to `deny_all` (a read has no caller to error back to; a
 *    write does).
 * 2. Switching to `'allowlist'` is REFUSED with a `BadRequest` while the project's CURRENT
 *    server-side `allowedModels` is `null`/`[]` -- not warned about, refused. A caller driving a
 *    "turn restriction on" flow MUST call `useSetProjectAllowedModels` with a non-empty list and
 *    await it BEFORE calling this. See `handleSetModelRestriction` in
 *    `apps/self-service/src/screens/project-settings-screen.tsx` for that sequence.
 * 3. This procedure never touches `allowedModels`, so the list is PRESERVED across a policy change
 *    in both directions. Turning the restriction off does not clear the selection, and turning it
 *    back on restores it -- render it that way rather than blanking the picker.
 *
 * Exposes `error` for the same reason `useSetProjectAllowedModels` does: (1) and (2) are real,
 * reachable rejections a caller must render, never swallow.
 */
export function useSetProjectModelPolicy() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      projectId,
      modelPolicy,
    }: {
      projectId: string;
      accountId: string;
      modelPolicy: ModelPolicy;
    }) => {
      const updated = await getAuthzRpcClient().procedures.setProjectModelPolicy({
        args: { projectId, modelPolicy },
      });
      return toProject(updated);
    },
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
