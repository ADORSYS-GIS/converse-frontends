'use client';

import { useMemo } from 'react';

import { useConsoleScope } from '../client/use-console-scope';
import type { DashboardLabelResolver } from '../dashboards/panel-adapters';
import { accountScopeLabel } from './account-label';

/**
 * Opaque group keys → readable names the console ALREADY HOLDS, for every declarative dashboard in
 * the account and settings areas (converse-frontends#455, story C12).
 *
 * The usage backend groups by ID, so `group_by: ['project_id']` comes back keyed
 * `zezxvt21irmoi0kzm22el7gu`. Every hand-written screen this story deleted resolved those against
 * data the console already loads for its own pickers — `scope.allProjects` for the project
 * select, `scope.allAccounts` for the workspace switcher — and dropping that in the migration
 * would have put raw cuid2s on the most-read charts in the console (the exact "raw id as a visible
 * label" the console-ui skill bans, and a papercut the owner has already had fixed once).
 *
 * **It resolves nothing it does not already hold.** Returning `undefined` means "no better name
 * than the id", which hands the key on to `labelFor` — the backend's own `resolveActorLabels`
 * batch — and, failing that, `panel-adapters.ts` renders the id itself. That is the honest fallback
 * for a project deleted since the usage was recorded, and never a fabricated name. Models come back
 * as human-readable strings from the gateway and are passed through untouched; the `unassigned`
 * sentinel is the adapter's own concern, not this function's.
 *
 * **API keys used to be here, behind an opt-in `projectId`, and are not any more**
 * (lightbridge-authz#674, owner feedback 2026-09-03: "can we use names on the 'Spend by API key'
 * panel? API keys do have names"). That path listed one project's keys, so it could only ever label
 * a page scoped to exactly one project — the account-family lens at `/settings/overview/usage` and
 * the account overview's own by-key breakdown both printed raw ids, which is the bug this replaced.
 * `resolveActorLabels` now answers for API keys, row-scoped through `ApiKey`'s own read policy
 * rather than gated on `user:read`, so it serves the same readers this resolver exists for AND
 * covers the multi-project pages. The listing is deleted rather than kept as a fallback: two
 * answers to one question is how they drift.
 */
export function useDashboardLabels(): DashboardLabelResolver {
  const scope = useConsoleScope();

  const projectNames = useMemo(
    () => new Map(scope.allProjects.map((project) => [project.id, project.name])),
    [scope.allProjects]
  );
  const accountNames = useMemo(
    () => new Map(scope.allAccounts.map((account) => [account.id, accountScopeLabel(account)])),
    [scope.allAccounts]
  );

  return useMemo<DashboardLabelResolver>(
    () => (dimension, key) => {
      switch (dimension) {
        case 'project_id':
          return projectNames.get(key) || undefined;
        case 'account_id':
          return accountNames.get(key) || undefined;
        default:
          // `model` (already readable), and every dimension whose names the console does not hold
          // locally — `api_key_id` and `user_id` are both answered by `resolveActorLabels` through
          // `labelFor`, one batched call per page rather than a listing per dimension.
          return undefined;
      }
    },
    [projectNames, accountNames]
  );
}
