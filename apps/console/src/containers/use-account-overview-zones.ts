'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd } from '@lightbridge/ui-web';
import type {
  BudgetNextReset,
  BudgetSummary,
  OverviewStatCardData,
  SelectFieldProps,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import { effectiveResetLabel, effectiveResetScheduleQueryKey } from './budget-schedule-rows';
import { isHomeAccount } from './account-ownership';
import {
  activeApiKeysCountFilters,
  buildBudgetConsumptionRequest,
  currentPeriodRange,
  sumTotalCost,
  toUrlDate,
} from './overview-usage';
import { microsToAmount } from './refill-rows';
import { BUDGET_HOME_ACCOUNT_ONLY_NOTE } from './use-budget-refill';

/**
 * The `/accounts/[accountId]/overview` zones the declarative engine does NOT draw
 * (converse-frontends#455, story C12) — the direct counterpart of
 * `use-admin-estate-operations.ts` for the account dashboard, and all that survives the 810-line
 * `use-overview-screen.ts` it replaces.
 *
 * `dashboards.yaml` describes usage queries over the page's RANGE. What is left here is exactly
 * what is not that:
 *
 *  1. **BUDGET** — `getMyBudgetBalance` (an RPC) for the ceiling, beside consumption measured over
 *     the BILLING PERIOD. Two reasons it cannot be a panel: half of it is not a usage query at
 *     all, and the half that is must not follow the range picker — a ceiling is a fact about this
 *     calendar month, so moving it with a `?range=7d` would compare a week's spend against a
 *     month's allowance.
 *  2. **The stat row** — the same billing-period spend, the remaining budget derived from it, and
 *     two refine COUNTS (projects, active API keys). Counts of rows in the authz database are not
 *     usage at all.
 *  3. **The next reset** — `getEffectiveResetSchedule`, likewise an RPC, and likewise a fact
 *     about the billing period rather than about the range (story C8).
 *  4. **The project picker**, which is a page FILTER (the `?project=` scope every panel's
 *     `filters.project_id: $project?` reads), not a zone.
 *
 * **Export is not here either**, though it was in this hook's predecessor: the page's action is
 * C10's `DashboardExportButton` (converse-frontends#453), which walks the resolved panel list
 * rather than building a consumption report that knows nothing about the panels beside it. The
 * mutation, the format/period/group-by params and the scope slot that fed the old dialog are all
 * deleted with it — one export path per page, not two.
 *
 * Deliberately NOT a smaller `use-overview-screen.ts`: it owns no chart series, no scale knobs, no
 * group-by vocabulary and no adapters. Everything that computed one is deleted, not moved.
 */

/** Matches `Meter`'s own default — the hero meter turns `--signal` at this ratio. */
const BUDGET_BREACH_THRESHOLD = 0.9;

export interface AccountOverviewZones {
  /** The scoped account's display label, for `PageHeader.subtitle`. `undefined` until it loads. */
  scopeAccountLabel: string | undefined;
  scopeProjectLabel: string;
  /** The `?project=` scope, as the panels' `$project?` placeholder reads it — `undefined` for
   *  "All projects", which drops the filter rather than sending an empty one. */
  projectId: string | undefined;
  projectField: Omit<SelectFieldProps, 'layout'>;
  /** Billing-period figures — see this module's doc comment for why they are not panels. */
  statCards: OverviewStatCardData[];
  statCardsLoading: boolean;
  budget: BudgetSummary;
  /** The account's next budget reset, under the hero (story C8). Four states, none of which is
   *  "render nothing because there is no schedule" — see `BudgetNextReset`. */
  nextReset: BudgetNextReset;
  /** The billing period these zones are measured over, for the caption that says so. */
  billingPeriodCaption: string;
}

export function useAccountOverviewZones(): AccountOverviewZones {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const budgetClient = useConsoleBudgetClient();

  const accountId = scope.value.accountId;
  const projectId = scope.value.projectId;

  const projects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: accountId ? [{ field: 'accountId', operator: 'eq', value: accountId }] : [],
  });

  const accountProjectIds = useMemo(
    () => scope.projects.map((project) => project.id),
    [scope.projects]
  );

  // See `activeApiKeysCountFilters`' own doc comment — `null` means "there is no safe filter to
  // send yet", which must never become an unfiltered, identity-wide count.
  const apiKeysCountFilters = activeApiKeysCountFilters(projectId, accountProjectIds);
  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: apiKeysCountFilters ?? [],
    queryOptions: { enabled: apiKeysCountFilters !== null },
  });

  // Resolved once per mount, not per render: a calendar-month period changes at most once a
  // session, and this keeps the budget queries' keys stable across re-renders.
  const period = useMemo(() => currentBudgetPeriod(), []);
  const billingPeriod = useMemo(() => currentPeriodRange(new Date()), []);

  // `getMyBudgetBalance` structurally answers for the caller's HOME account only — computed once
  // and threaded through both the query's `enabled` guard and the summary below, so neither can
  // drift into showing the home account's numbers under a different account's label.
  const accountIsHome = isHomeAccount(accountId, session);

  const consumptionQuery = useQuery({
    queryKey: ['usage', 'budget-consumption', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionRequest(accountId, new Date())),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const balanceQuery = useQuery({
    queryKey: ['budget', 'myBalance', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetBalance({ args: { period } }),
    enabled: Boolean(accountId) && accountIsHome,
    staleTime: 30_000,
  });

  const budget: BudgetSummary = useMemo(() => {
    // Checked FIRST: a non-home account never fires `balanceQuery` at all, so falling through to
    // the pending branch would render a permanently-loading card instead of the honest, explained
    // gap `BudgetSummaryUnwired` is for.
    if (!accountIsHome) {
      return { status: 'unwired', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
    }
    if (consumptionQuery.isError) {
      return {
        status: 'error',
        errorMessage: getUsageErrorMessage(consumptionQuery.error),
        onRetry: () => void consumptionQuery.refetch(),
      };
    }
    if (balanceQuery.isError) {
      return {
        status: 'error',
        errorMessage: 'Failed to load the account budget ceiling.',
        onRetry: () => void balanceQuery.refetch(),
      };
    }
    if (consumptionQuery.isPending || balanceQuery.isPending) {
      return { status: 'loading' };
    }
    const value = sumTotalCost(consumptionQuery.data);
    const ceiling = microsToAmount(balanceQuery.data.effectiveBudgetMicros);
    const percent = ceiling > 0 ? Math.round((value / ceiling) * 100) : 0;
    return {
      value,
      ceiling,
      threshold: BUDGET_BREACH_THRESHOLD,
      caption: `account ceiling · ${percent}% used this period`,
    };
  }, [
    accountIsHome,
    consumptionQuery.isError,
    consumptionQuery.isPending,
    consumptionQuery.data,
    consumptionQuery.error,
    balanceQuery.isError,
    balanceQuery.isPending,
    balanceQuery.data,
    balanceQuery.error,
  ]);

  /**
   * Which reset schedule governs THIS account (story C8, converse-frontends#457).
   *
   * `getEffectiveResetSchedule` rather than the caller's own: this page is account-scoped by its
   * path, so it answers for whatever account the path is on. `retry: false` and the shared
   * `effectiveResetScheduleQueryKey` — a forbidden read must not retry-storm a page that works fine
   * without this line, and `/admin/overview`'s fan-out asks the identical question for the same
   * accounts, so one key means the two zones can never state different next resets for one account.
   */
  const resetScheduleQuery = useQuery({
    queryKey: effectiveResetScheduleQueryKey(accountId ?? ''),
    queryFn: () =>
      budgetClient.procedures.getEffectiveResetSchedule({
        args: { budgetAccountId: accountId as string },
      }),
    enabled: Boolean(accountId),
    staleTime: 300_000,
    retry: false,
  });

  const nextReset = useMemo<BudgetNextReset>(() => {
    if (!accountId || resetScheduleQuery.isPending) return { status: 'loading' };
    if (resetScheduleQuery.isError) {
      // "We could not ask" is not "there is none" — the two must never render as the same line.
      return {
        status: 'unavailable',
        caption: 'Next reset unknown — the reset schedule could not be read for this account.',
      };
    }
    // The FETCH timestamp, not `Date.now()` — the house idiom: reading the clock during render is
    // impure, and "in 3 days" is relative to when the schedule was read.
    const label = effectiveResetLabel(resetScheduleQuery.data, resetScheduleQuery.dataUpdatedAt);
    return label ? { status: 'scheduled', label } : { status: 'none' };
  }, [
    accountId,
    resetScheduleQuery.isPending,
    resetScheduleQuery.isError,
    resetScheduleQuery.data,
    resetScheduleQuery.dataUpdatedAt,
  ]);

  // Money first, then the counts. Never a fabricated figure: SPEND is an em dash while the period
  // query is unresolved, and BUDGET REMAINING is dropped entirely rather than guessed at.
  const statCards = useMemo<OverviewStatCardData[]>(() => {
    const cards: OverviewStatCardData[] = [
      {
        key: 'spend',
        label: 'Spend this period',
        metric: consumptionQuery.data ? formatUsd(sumTotalCost(consumptionQuery.data)) : '—',
      },
    ];
    if ('value' in budget && 'ceiling' in budget) {
      cards.push({
        key: 'budget-remaining',
        label: 'Budget remaining',
        metric: formatUsd(budget.ceiling - budget.value),
      });
    }
    cards.push(
      { key: 'keys', label: 'Active API keys', metric: String(apiKeys.result.total ?? 0) },
      { key: 'projects', label: 'Projects', metric: String(projects.result.total ?? 0) }
    );
    return cards;
  }, [consumptionQuery.data, budget, apiKeys.result.total, projects.result.total]);

  const activeAccount = scope.allAccounts.find((account) => account.id === accountId);
  const scopeProjectLabel =
    scope.projects.find((project) => project.id === projectId)?.label ?? 'All projects';

  return {
    scopeAccountLabel: activeAccount ? accountScopeLabel(activeAccount) : undefined,
    scopeProjectLabel,
    projectId: projectId ?? undefined,
    projectField: {
      label: 'Project',
      value: projectId ?? '',
      options: [
        { value: '', label: 'All projects' },
        ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
      ],
      onChange: (next) => scope.setValue({ accountId, projectId: next || null }),
    },
    statCards,
    // `|| scope.loading`: `apiKeys` is disabled (never "loading") until `accountProjectIds`
    // resolves, so the card must not settle on a false "0 active keys" before scope has loaded.
    statCardsLoading: projects.query.isLoading || apiKeys.query.isLoading || scope.loading,
    budget,
    nextReset,
    billingPeriodCaption:
      `Spend this period, the remaining budget and the ceiling above are measured over the ` +
      `billing period (${toUrlDate(billingPeriod.start)} → today), not the range picked above — ` +
      'a ceiling is a fact about this calendar month.',
  };
}
