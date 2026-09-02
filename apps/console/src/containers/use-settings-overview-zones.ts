'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import type {
  ApiKeysHygiene,
  BudgetPressureProject,
  BudgetPressureStatus,
  DashboardStatus,
  SelectFieldProps,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import { apiKeysAccountFilters, apiKeysHygiene, apiKeysStatusSummary } from './api-key-rows';
import { isHomeAccount } from './account-ownership';
import {
  buildBudgetConsumptionByProjectRequest,
  toSpendShareSegments,
  type SeriesLabeller,
} from './overview-usage';
import { microsToAmount } from './refill-rows';
import { sentinelLabel } from './sentinel-labels';
import { buildBurnDownRequest, toAggregateDaySeries } from './settings-overview-usage';
import { UNASSIGNED_KEY } from './overview-usage';

/**
 * The `/settings/overview/{account,project,user}` zones the declarative engine does NOT draw
 * (converse-frontends#455, story C12) — the counterpart of `use-account-overview-zones.ts` for the
 * settings lenses, and all that survives the 592-line `use-settings-overview-screen.ts`.
 *
 * `dashboards.yaml` now owns every zone that was a usage query over the lens's range: the stat
 * row, the spend chart, the by-model ranking, each lens's secondary breakdown and the latency
 * cards. Three zones are NOT that, and stay here:
 *
 *  1. **Budget burn-down** (account lens) — a cumulative chart over the BILLING PERIOD, against a
 *     ceiling that is an RPC (`getMyBudgetBalance`). Both halves disqualify it as a panel: it does
 *     not follow the range picker, and half of it is not usage data at all.
 *  2. **Budget pressure** (project lens, admin only) — the account-wide per-project draw on that
 *     same single ceiling, likewise over the billing period.
 *  3. **Key hygiene** (account lens, admin only) — a refine listing of the account's API keys.
 *     Rows in the authz database, not usage.
 *
 * Plus the project lens's own PICKER, which is a page filter (`$projectId`) rather than a zone.
 *
 * The lens's own `ready` gate lives here too: the project lens fires nothing at all until a
 * project is scoped, and the user lens nothing until the session's subject resolves — never an
 * unscoped query, and never a permanently-loading placeholder.
 */

export type SettingsOverviewLens = 'account' | 'project' | 'user';

export const LENS_TITLE: Record<SettingsOverviewLens, string> = {
  account: 'Account overview',
  project: 'Project overview',
  user: 'Your usage',
};

/** How many API keys the hygiene block reads in one page, and how many projects it resolves names
 *  against. `ApiKey` carries `projectId`, never `accountId`, so the account-wide fetch below is
 *  filtered indirectly: `projectId in [this account's own project ids]`. */
const KEYS_PAGE_SIZE = 100;
const PROJECTS_PAGE_SIZE = 100;

/**
 * The budget-pressure zone's scope caveat, stated in the UI rather than only in a code comment.
 * There is no per-project budget ceiling anywhere in the authz schema, so what this shows is each
 * project's draw on the account's ONE ceiling, never a per-project headroom.
 */
export const BUDGET_PRESSURE_SCOPE_NOTE =
  'Each bar is the project’s draw on the account’s single ceiling for this billing period. ' +
  'Projects have no ceiling of their own — a project’s quota is a governance tier, not a ' +
  'currency amount — so this ranks pressure, it does not report per-project headroom.';

/** The admin-only "Budget pressure" card's data — project lens only. */
export interface AdminPressureCard {
  projects: BudgetPressureProject[];
  /** `null` when no ceiling could be read — `BudgetPressure` then drops its meters entirely. */
  ceiling: number | null;
  status: BudgetPressureStatus;
  errorMessage?: string;
  onRetry: () => void;
  note: string;
}

/** The admin-only "Key hygiene" card's data — account lens only. */
export interface AdminHygieneCard {
  hygiene: ApiKeysHygiene;
  summary: string;
  /** Set only when the key listing was truncated — never left implicit. */
  caveat?: string;
}

export interface SettingsOverviewZones {
  title: string;
  subtitle: string | undefined;
  /** `false` while the lens has no scope id yet — every panel is suspended rather than fired
   *  unscoped, and the page states why instead of drawing empty boards. */
  ready: boolean;
  /** What the lens's `$accountId`/`$projectId`/`$sub` placeholder resolves to. `''` until ready. */
  scopeId: string;
  /** Project lens only. */
  projectField: Omit<SelectFieldProps, 'layout'> | undefined;
  /** Account lens only — the cumulative billing-period burn-down beside its RPC ceiling. */
  burnDown:
    { series: SpendSeriesSeries[]; ceiling: number | null; status: DashboardStatus } | undefined;
  /** Project lens, admin only. `undefined` for a non-admin or any other lens — never a
   *  permanently-loading placeholder (the query never fires for either case). */
  adminPressure: AdminPressureCard | undefined;
  /** Account lens, admin only. Same "undefined, never loading" contract. */
  adminHygiene: AdminHygieneCard | undefined;
}

export function useSettingsOverviewZones(lens: SettingsOverviewLens): SettingsOverviewZones {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const isAdmin = session.isAdmin;
  const budgetClient = useConsoleBudgetClient();

  const accountId = scope.value.accountId;
  const userId = session.user?.sub ?? '';
  const scopeId =
    lens === 'project' ? (scope.value.projectId ?? '') : lens === 'user' ? userId : accountId;
  const ready = Boolean(scopeId);

  const namesById = useMemo(
    () => new Map(scope.allProjects.map((project) => [project.id, project.name])),
    [scope.allProjects]
  );
  const labelForProject: SeriesLabeller = useMemo(
    () => (key) => (key === UNASSIGNED_KEY ? 'Unassigned' : namesById.get(key) || key),
    [namesById]
  );

  // Resolved once per mount, not per render — the same "moving default, resolved once" pattern
  // every other billing-period read in this app uses.
  const period = useMemo(() => currentBudgetPeriod(), []);
  const accountIsHome = isHomeAccount(accountId, session);

  const burnDownQuery = useQuery({
    queryKey: ['usage', 'settings-overview-burn-down', accountId, period],
    queryFn: () => queryUsage(buildBurnDownRequest(accountId, new Date())),
    enabled: lens === 'account' && Boolean(accountId),
    staleTime: 30_000,
  });

  const balanceQuery = useQuery({
    queryKey: ['budget', 'myBalance', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetBalance({ args: { period } }),
    // Account lens: every user (the burn-down's own ceiling). Project lens: admin only (the
    // BudgetPressure card's ceiling) — a non-admin on the project lens never fires this.
    enabled:
      (lens === 'account' || (lens === 'project' && isAdmin)) &&
      Boolean(accountId) &&
      accountIsHome,
    staleTime: 30_000,
  });

  // Always account-wide, never narrowed to the ONE project this lens's picker has scoped: an
  // operator's cross-project picture is exactly the narrowing this card exists to refuse.
  const pressureQuery = useQuery({
    queryKey: ['usage', 'budget-consumption-by-project', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionByProjectRequest(accountId, new Date())),
    enabled: lens === 'project' && Boolean(accountId) && isAdmin,
    staleTime: 30_000,
  });

  const pressureProjects = useMemo<BudgetPressureProject[]>(
    () =>
      pressureQuery.data
        ? toSpendShareSegments(pressureQuery.data, 'project_id', labelForProject).map(
            (segment) => ({
              key: segment.key,
              name: segment.label,
              spend: segment.value,
            })
          )
        : [],
    [pressureQuery.data, labelForProject]
  );
  const pressureStatus: BudgetPressureStatus = pressureQuery.isError
    ? 'error'
    : pressureQuery.isPending
      ? 'loading'
      : 'ready';
  const pressureCeiling =
    accountIsHome && balanceQuery.data
      ? microsToAmount(balanceQuery.data.effectiveBudgetMicros)
      : null;

  // Account-wide (every project, not only the scoped one). The listing is filtered SERVER-side to
  // `projectId in […]`, never an identity-wide fetch re-filtered client-side.
  const adminProjects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: PROJECTS_PAGE_SIZE },
    filters: accountId ? [{ field: 'accountId', operator: 'eq', value: accountId }] : [],
    queryOptions: { enabled: lens === 'account' && isAdmin },
  });
  const adminAccountProjectIds = useMemo(
    () => adminProjects.result.data.map((project) => project.id),
    [adminProjects.result.data]
  );
  const adminApiKeysFilters = apiKeysAccountFilters({
    projectId: null,
    accountProjectIds: adminAccountProjectIds,
  });
  const adminApiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: KEYS_PAGE_SIZE },
    filters: adminApiKeysFilters ?? [],
    queryOptions: { enabled: lens === 'account' && isAdmin && adminApiKeysFilters !== null },
  });
  const accountKeys = adminApiKeys.result.data;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure, and an
  // "expires in N days" count is relative to when the listing was read.
  const adminKeysReadAt = adminApiKeys.query.dataUpdatedAt;
  const adminKeysTotal = adminApiKeys.result.total ?? accountKeys.length;

  const burnDown = useMemo(() => {
    if (lens !== 'account') return undefined;
    const status: DashboardStatus =
      burnDownQuery.isError || (accountIsHome && balanceQuery.isError)
        ? 'error'
        : burnDownQuery.isPending || (accountIsHome && balanceQuery.isPending)
          ? 'loading'
          : 'ready';
    const series = burnDownQuery.data
      ? [toAggregateDaySeries(burnDownQuery.data, 'This account')]
      : [];
    const ceiling =
      accountIsHome && balanceQuery.data
        ? microsToAmount(balanceQuery.data.effectiveBudgetMicros)
        : null;
    return { series, ceiling, status };
  }, [
    lens,
    burnDownQuery.isError,
    burnDownQuery.isPending,
    burnDownQuery.data,
    accountIsHome,
    balanceQuery.isError,
    balanceQuery.isPending,
    balanceQuery.data,
  ]);

  const subtitle = useMemo(() => {
    if (lens === 'account') {
      const account = scope.allAccounts.find((a) => a.id === accountId);
      return account ? account.name || sentinelLabel(account.id).label : undefined;
    }
    if (lens === 'project') {
      if (!scopeId) return 'No project selected';
      const project = scope.projects.find((p) => p.id === scopeId);
      return project?.label ?? sentinelLabel(scopeId).label;
    }
    return sentinelLabel(userId, session.user?.name || session.user?.preferredUsername).label;
  }, [lens, scope.allAccounts, scope.projects, accountId, scopeId, userId, session.user]);

  return {
    title: LENS_TITLE[lens],
    subtitle,
    ready,
    scopeId,
    projectField:
      lens === 'project'
        ? {
            label: 'Project',
            value: scope.value.projectId ?? '',
            options: [
              { value: '', label: 'Select a project…' },
              ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
            ],
            onChange: (projectId) =>
              scope.setValue({ accountId: scope.value.accountId, projectId: projectId || null }),
          }
        : undefined,
    burnDown,
    adminPressure:
      lens === 'project' && isAdmin
        ? {
            projects: pressureProjects,
            ceiling: pressureCeiling,
            status: pressureStatus,
            errorMessage: pressureQuery.isError
              ? getUsageErrorMessage(pressureQuery.error)
              : undefined,
            onRetry: () => void pressureQuery.refetch(),
            note: BUDGET_PRESSURE_SCOPE_NOTE,
          }
        : undefined,
    adminHygiene:
      lens === 'account' && isAdmin
        ? {
            hygiene: apiKeysHygiene(accountKeys, adminKeysReadAt),
            summary: apiKeysStatusSummary(accountKeys, adminKeysReadAt),
            // The listing IS scoped to this account's own projects server-side — the only
            // remaining truncation is genuine pagination.
            caveat:
              adminKeysTotal > accountKeys.length
                ? `Counted over the first ${accountKeys.length} of ${adminKeysTotal} keys in this account — the rest are beyond this page.`
                : undefined,
          }
        : undefined,
  };
}
