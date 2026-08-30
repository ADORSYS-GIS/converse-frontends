'use client';

import type { ModelCatalogEntry } from '@lightbridge/authz-rpc';
import type { ProjectPolicyControlsProps } from '@lightbridge/ui-web/src/sections/project-policy-controls';
import { useInvalidate } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { useSharedMutation } from '../client/use-shared-mutation';
import type { AccountSettingsScreen } from './use-account-settings-screen';
import { useAccountSettingsScreen } from './use-account-settings-screen';
import type { ProjectSettingsScreen } from './use-project-settings-screen';
import { useProjectSettingsScreen } from './use-project-settings-screen';

/**
 * `/settings/policies` — composes the RETAINED `use-account-settings-screen.ts`/
 * `use-project-settings-screen.ts` adapters (IA v3 phase 2: their own routes,
 * `/settings/account`/`/settings/projects`, are deleted, but the data adapters and the sections
 * they feed — `AccountSettings`/`ProjectSettings` — are not; this screen is where both now live)
 * PLUS the new project-governance controls this phase adds: `setProjectModelPolicy` and
 * `setProjectAllowedModels`, both dedicated write paths on `Project` (see
 * `sections/project-policy-controls`' own doc comment for the full backend contract).
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
  accountSettings: AccountSettingsScreen['accountSettings'];
  projectSettings: ProjectSettingsScreen['projectSettings'];
  projectDetail: ProjectSettingsScreen['projectDetail'];
  projectNameDialog: ProjectSettingsScreen['projectNameDialog'];
  projectCount: number;
  onCopyId: (accountId: string) => void;
  /** `null` whenever there is no selected project to show controls for — `policies-centre.tsx`
   *  renders the section only inside the project detail sheet, which is itself selection-gated. */
  policyControls: ProjectPolicyControlsProps | null;
}

export function usePoliciesScreen(): PoliciesScreen {
  const accountScreen = useAccountSettingsScreen();
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
    scopeLabel: accountScreen.scopeLabel,
    accountSettings: accountScreen.accountSettings,
    projectSettings: projectScreen.projectSettings,
    projectDetail: projectScreen.projectDetail,
    projectNameDialog: projectScreen.projectNameDialog,
    projectCount: projectScreen.projectCount,
    onCopyId: (accountId: string) => {
      void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
    },
    policyControls,
  };
}
