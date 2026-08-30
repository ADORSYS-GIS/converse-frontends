'use client';

import type { BillingPlanInfo } from '@lightbridge/authz-rpc';
import { useQuery } from '@tanstack/react-query';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';

/**
 * `/settings/tiers` — the data adapter. Two catalogues, read-only, NO picker of any kind (the
 * deliverable is explicit: this screen shows what tiers ARE, never lets anyone assign one):
 *
 *  - **Billing plans** — `procedure.listBillingPlans`, the operator-configured plan catalogue
 *    (`id`, `name`, `limits`). A real read API; rendered verbatim, one `Card` per plan.
 *  - **Assigned quota tiers** — NOT a catalogue at all, because none exists to read
 *    (lightbridge-authz#572, filed from this phase's own work — twin of `listBillingPlans` that
 *    does not exist yet for `QuotaTiers`). What CAN be shown honestly: which tier id is currently
 *    ASSIGNED where — the scoped account's own `defaultQuota`, plus every one of its projects'
 *    `projectQuota` — both real columns this console already fetches for other screens
 *    (`use-console-scope.ts`'s `allAccounts`/`allProjects`), reduced to read-only rows here.
 */

const BILLING_PLANS_QUERY_KEY = ['projects', 'billingPlans'];

export interface AssignedQuotaTierRow {
  key: string;
  label: string;
  quotaTier: string | null;
}

export interface TiersScreen {
  scopeLabel: string | undefined;
  plans: BillingPlanInfo[];
  plansLoading: boolean;
  plansError: string | undefined;
  onRetryPlans: () => void;
  assignedTiers: AssignedQuotaTierRow[];
  assignedTiersLoading: boolean;
}

export function useTiersScreen(): TiersScreen {
  const client = useConsoleAuthzClient();
  const scope = useConsoleScope();

  // Shares the identical query key `use-create-project-dialog.ts` already uses for the same
  // procedure — one cache entry, not two independent fetches, regardless of which screen mounts
  // first.
  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: BILLING_PLANS_QUERY_KEY,
    queryFn: () => client.procedures.listBillingPlans({ args: {} }),
  });

  const scopedAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);
  const accountProjects = scope.allProjects.filter(
    (project) => project.accountId === scope.value.accountId
  );

  const assignedTiers: AssignedQuotaTierRow[] = scopedAccount
    ? [
        {
          key: `account:${scopedAccount.id}`,
          label: `${accountScopeLabel(scopedAccount)} (account default)`,
          quotaTier: scopedAccount.defaultQuota ?? null,
        },
        ...accountProjects.map((project) => ({
          key: `project:${project.id}`,
          label: project.name,
          quotaTier: project.projectQuota ?? null,
        })),
      ]
    : [];

  return {
    scopeLabel: scopedAccount ? accountScopeLabel(scopedAccount) : undefined,
    plans: plansQuery.data ?? [],
    plansLoading: plansQuery.isLoading,
    plansError: plansQuery.isError ? 'Could not load billing plans.' : undefined,
    onRetryPlans: () => void plansQuery.refetch(),
    assignedTiers,
    assignedTiersLoading: scope.loading,
  };
}
