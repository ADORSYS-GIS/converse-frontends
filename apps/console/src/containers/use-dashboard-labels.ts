'use client';

import type { ApiKey } from '@lightbridge/authz-rpc';
import { useList } from '@refinedev/core';
import { useMemo } from 'react';

import { useConsoleScope } from '../client/use-console-scope';
import type { DashboardLabelResolver } from '../dashboards/panel-adapters';
import { accountScopeLabel } from './account-label';

/**
 * Opaque group keys → readable names, for every declarative dashboard in the account and settings
 * areas (converse-frontends#455, story C12).
 *
 * The usage backend groups by ID, so `group_by: ['project_id']` comes back keyed
 * `zezxvt21irmoi0kzm22el7gu`. Every hand-written screen this story deleted resolved those against
 * data the console already loads for its own pickers — `scope.allProjects` for the project
 * select, `scope.allAccounts` for the workspace switcher — and dropping that in the migration
 * would have put raw cuid2s on the most-read charts in the console (the exact "raw id as a visible
 * label" the console-ui skill bans, and a papercut the owner has already had fixed once).
 *
 * **It resolves nothing it does not already hold.** Returning `undefined` means "no better name
 * than the id", which `panel-adapters.ts` renders as the id itself — the honest fallback for a
 * project deleted since the usage was recorded, and never a fabricated name. Models come back as
 * human-readable strings from the gateway and are passed through untouched; the `unassigned`
 * sentinel is the adapter's own concern, not this function's.
 *
 * **API keys are opt-in** (`projectId`), because they are the one dimension whose names are not
 * already in memory: only a project-scoped page has a bounded, already-authorized listing to
 * resolve them against. An account-wide page asks for no key listing and gets key IDs, which is
 * better than firing an extra request per dashboard for a label.
 */
export interface DashboardLabelsInput {
  /** Resolve API-key ids against this project's own keys. Omit on a page that has no single
   *  project — see this module's doc comment. */
  projectId?: string | null;
}

const API_KEYS_PAGE_SIZE = 100;

export function useDashboardLabels({
  projectId,
}: DashboardLabelsInput = {}): DashboardLabelResolver {
  const scope = useConsoleScope();

  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: API_KEYS_PAGE_SIZE },
    filters: projectId ? [{ field: 'projectId', operator: 'eq', value: projectId }] : [],
    queryOptions: { enabled: Boolean(projectId) },
  });

  const projectNames = useMemo(
    () => new Map(scope.allProjects.map((project) => [project.id, project.name])),
    [scope.allProjects]
  );
  const accountNames = useMemo(
    () => new Map(scope.allAccounts.map((account) => [account.id, accountScopeLabel(account)])),
    [scope.allAccounts]
  );
  const apiKeyNames = useMemo(
    () => new Map(apiKeys.result.data.map((key) => [key.id, key.name])),
    [apiKeys.result.data]
  );

  return useMemo<DashboardLabelResolver>(
    () => (dimension, key) => {
      switch (dimension) {
        case 'project_id':
          return projectNames.get(key) || undefined;
        case 'account_id':
          return accountNames.get(key) || undefined;
        case 'api_key_id':
          return apiKeyNames.get(key) || undefined;
        default:
          // `model` (already readable), `user_id` (no profile read exists for it yet — lane A2's
          // `resolveUserProfiles` is what will fill this in) and every dimension lane A3 adds.
          return undefined;
      }
    },
    [projectNames, accountNames, apiKeyNames]
  );
}
