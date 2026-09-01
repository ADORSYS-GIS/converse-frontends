'use client';

import type { ModelCatalogEntry } from '@lightbridge/authz-rpc';
import type { ProjectPolicyControlsProps } from '@lightbridge/ui-web/src/sections/project-policy-controls';
import { useInvalidate } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { useSharedMutation } from '../client/use-shared-mutation';
import type { ProjectSettingsScreen } from './use-project-settings-screen';
import { useProjectSettingsScreen } from './use-project-settings-screen';

/**
 * `/settings/policies` — "Project policies" (IA v3 phase 2, narrowed by IA v3 phase E — owner:
 * "there's no sense in having account or project creation" on this page). Composes the RETAINED
 * `use-project-settings-screen.ts` adapter (its own route, `/settings/projects`, was deleted in
 * phase 2, but the data adapter and the section it feeds — `ProjectSettings` — are not) PLUS the
 * project-governance controls this page's whole job now is: `setProjectModelPolicy` and
 * `setProjectAllowedModels`, both dedicated write paths on `Project` (see
 * `sections/project-policy-controls`' own doc comment for the full backend contract).
 *
 * **IA v3 phase E moves TWO things off this screen, not one.** `AccountSettings` (rename +
 * id/status/tier facts) moved to `/settings/accounts/<id>` — a core account mutation has no more
 * business sitting above a project-policy picker than it did above the old Projects ledger's own
 * filters (owner, 2026-08-29: "We cannot modify account core information on the same page we're
 * filtering" — the same reasoning, one level over). And BOTH `+ New account`/`+ New project`
 * creation triggers are gone from this page's `PageHeader` — account creation lives at
 * `/settings/accounts`, project creation at `/settings/accounts/<id>/projects?create=true`. What
 * remains is exactly "project policy editing": browse projects (still needed as the picker this
 * page's own governance controls act on), open one, edit its model policy.
 *
 * `procedure.listModelCatalog` is fetched once here, shared by every project's policy controls —
 * the catalogue is account-independent (`config.models`, operator-wide), so there is exactly one
 * query regardless of which project's sheet is open.
 *
 * The selected project's raw `allowedModels`/`modelPolicy` come from `useConsoleScope().
 * allProjects` — the SAME unfiltered `Project[]` `use-refills-queue-screen.ts`/`inspector-rail.tsx` already
 * read for raw fields `ProjectSettingsRow` deliberately omits (its own doc comment: "no
 * `defaultLimits`/`allowedModels` — both are opaque `Json`, and rendering a blob as a settings row
 * would be noise"). Reading the same list `useProjectSettingsScreen` already fetches (same
 * resource/pagination/filters produce the identical TanStack Query cache entry) costs no extra
 * request.
 */

const MODEL_CATALOG_QUERY_KEY = ['projects', 'modelCatalog'];
const MODEL_POLICY_MUTATION_KEY = ['settings', 'project-model-policy'];
const ALLOWED_MODELS_MUTATION_KEY = ['settings', 'project-allowed-models'];

export interface PoliciesScreen {
  scopeLabel: string | undefined;
  projectSettings: ProjectSettingsScreen['projectSettings'];
  projectDetail: ProjectSettingsScreen['projectDetail'];
  projectNameDialog: ProjectSettingsScreen['projectNameDialog'];
  projectCount: number;
  /** `null` whenever there is no selected project to show controls for — `policies-centre.tsx`
   *  renders the section only inside the project detail sheet, which is itself selection-gated. */
  policyControls: ProjectPolicyControlsProps | null;
}

export function usePoliciesScreen(): PoliciesScreen {
  const projectScreen = useProjectSettingsScreen();
  const client = useConsoleAuthzClient();
  const scope = useConsoleScope();
  const invalidate = useInvalidate();

  const catalogQuery = useQuery<ModelCatalogEntry[]>({
    queryKey: MODEL_CATALOG_QUERY_KEY,
    queryFn: () => client.procedures.listModelCatalog({ args: {} }),
  });
  const catalog = catalogQuery.data ?? [];

  const selectedProjectId = projectScreen.projectDetail.project?.id;
  const rawSelectedProject = selectedProjectId
    ? (scope.allProjects.find((project) => project.id === selectedProjectId) ?? null)
    : null;

  const invalidateProjects = () => {
    void invalidate({ resource: 'projects', invalidates: ['list'] });
    scope.refetch();
  };

  const policyAction = useSharedMutation<{ projectId: string; modelPolicy: string }, void>({
    mutationKey: MODEL_POLICY_MUTATION_KEY,
    mutationFn: async ({ projectId, modelPolicy }) => {
      await client.procedures.setProjectModelPolicy({ args: { projectId, modelPolicy } });
    },
    onSuccess: invalidateProjects,
  });

  const allowedModelsAction = useSharedMutation<
    { projectId: string; allowedModels: string[] },
    void
  >({
    mutationKey: ALLOWED_MODELS_MUTATION_KEY,
    mutationFn: async ({ projectId, allowedModels }) => {
      await client.procedures.setProjectAllowedModels({
        args: { projectId, allowedModels },
      });
    },
    onSuccess: invalidateProjects,
  });

  const policyControls: ProjectPolicyControlsProps | null = rawSelectedProject
    ? {
        modelPolicy: rawSelectedProject.modelPolicy,
        onModelPolicyChange: (modelPolicy) => {
          policyAction.mutate({ projectId: rawSelectedProject.id, modelPolicy });
        },
        policySaving: policyAction.isPending,
        policyError: policyAction.errorMessage,
        // `allowedModels` is opaque `Json?` on the wire — `null`/non-array both read as "none".
        allowedModels: Array.isArray(rawSelectedProject.allowedModels)
          ? (rawSelectedProject.allowedModels as string[])
          : [],
        onAllowedModelsChange: (allowedModels) => {
          allowedModelsAction.mutate({ projectId: rawSelectedProject.id, allowedModels });
        },
        catalog,
        catalogLoading: catalogQuery.isLoading,
        catalogError: catalogQuery.isError ? 'Could not load the model catalogue.' : undefined,
        onRetryCatalog: () => void catalogQuery.refetch(),
        allowedModelsSaving: allowedModelsAction.isPending,
        allowedModelsError: allowedModelsAction.errorMessage,
      }
    : null;

  return {
    scopeLabel: projectScreen.scopeLabel,
    projectSettings: projectScreen.projectSettings,
    projectDetail: projectScreen.projectDetail,
    projectNameDialog: projectScreen.projectNameDialog,
    projectCount: projectScreen.projectCount,
    policyControls,
  };
}
