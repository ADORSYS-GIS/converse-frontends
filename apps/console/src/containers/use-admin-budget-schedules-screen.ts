'use client';

import { getApiErrorMessage } from '@lightbridge/hooks/api-error';
import { PREVIEW_ENTRY_LIMIT } from '@lightbridge/ui-web';
import type { BudgetSchedulePreviewEntry, BudgetSchedulePreviewStatus } from '@lightbridge/ui-web';
import type {
  ActorAccountLabel,
  BillingPlanInfo,
  BudgetResetSchedule,
  BudgetResetScheduleRunResult,
} from '@lightbridge/authz-rpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useAdminBudgetSchedulesParams } from '../client/url-state';
import { useConsoleAuthzClient, useConsoleBudgetClient } from '../client/rpc-clients';
import {
  runResultAccountIds,
  toBudgetScheduleRow,
  toPreviewEntries,
  type BudgetScheduleRow,
} from './budget-schedule-rows';

/**
 * `/admin/budget-schedules` — the list screen's data adapter (converse-frontends#451, story C8;
 * backend ADR-0032, lightbridge-authz#653).
 *
 * The route is mode-split by nuqs params, the SAME shape `/admin/refill-policies` uses
 * (`use-refill-policies-screen.ts`): the bare path is the list, `?edit=<id>` opens the form on a
 * stored schedule, `?preview=<id>` opens the dry-run sheet, `?delete=<id>` opens the typed
 * confirmation. `create` is its own route segment, not a param.
 *
 * ── FOUR QUERIES, AND WHY EACH IS SEPARATE ──────────────────────────────────────────────────
 *  1. `listBudgetResetSchedules` — unpaginated by design; this is operator-authored configuration
 *     measured in tens of rows, not a ledger.
 *  2. `listBillingPlans` — the plan catalogue, so a `billing_plan`-scoped row reads "Plan free"
 *     rather than "Plan pl_9f2". Shares the exact query key `use-tiers-screen.ts`/
 *     `use-create-project-dialog.ts` already use, so it is one cache entry across the app.
 *  3. `resolveActorLabels` — the account names for `account`-scoped rows AND for whatever a preview
 *     turns out to mention. It runs on the union of both id sets so a preview does not fire a
 *     second identity round trip; the union is small (tens of scoped rows, at most
 *     `PREVIEW_ENTRY_LIMIT` preview rows) and the procedure is a batch by construction.
 *  4. the dry-run itself, which is a MUTATION even when `dryRun: true` —
 *     `runBudgetResetScheduleNow` is a `mutation procedure` on the wire, and modelling a preview as
 *     a query would let react-query refetch it on a window focus, firing an estate-wide plan
 *     computation nobody asked for.
 *
 * ── THE ENABLED TOGGLE IS OPTIMISTIC, WITH A REAL ROLLBACK ──────────────────────────────────
 * A switch that waits for a round trip before moving reads as broken. So the cache is written
 * first, the previous list is kept, and a failure restores it and states why inline
 * (`toggleErrorMessage`) rather than leaving the switch showing a state the backend never accepted.
 * This is the story's own negative acceptance criterion, and it is why the toggle does not go
 * through `invalidateQueries` on the way IN — only on settle.
 *
 * ── WHY THERE IS NO CLIENT-SIDE PRECEDENCE ANYWHERE HERE ────────────────────────────────────
 * When several schedules match one account the winner is account > billing_plan > global, and the
 * BACKEND decides it: `getEffectiveResetSchedule` answers for a single account and a run result
 * reports `supersededAccountIds`. Nothing in this hook recomputes that ordering, so the console can
 * never disagree with what the scheduler will actually do.
 */

const SCHEDULES_QUERY_KEY = ['budget', 'resetSchedules'] as const;

/** The same key `use-tiers-screen.ts` and `use-create-project-dialog.ts` already use — one cache
 *  entry for the plan catalogue across the whole app, not a third independent fetch. */
const BILLING_PLANS_QUERY_KEY = ['billingPlans'] as const;

export type AdminBudgetSchedulesMode = 'list' | 'edit';

export type BudgetSchedulesStatus = 'loading' | 'ready' | 'error';

export interface BudgetSchedulePreviewScreen {
  /** The schedule the sheet is open on, or `null` when it is closed. */
  scheduleId: string | null;
  title: string;
  subtitle: string;
  status: BudgetSchedulePreviewStatus;
  dryRun: boolean;
  windowLabel?: string;
  entries: BudgetSchedulePreviewEntry[];
  totalEntryCount: number;
  entryLimit: number;
  deferredCount: number;
  supersededCount: number;
  errorMessage?: string;
  onRetry: () => void;
  onClose: () => void;
  /** The second confirmation: only offered once a dry run has actually been seen. */
  canRunForReal: boolean;
  onRunForReal: () => void;
  runningForReal: boolean;
}

export interface AdminBudgetSchedulesScreen {
  mode: AdminBudgetSchedulesMode;
  /** `?edit=<id>`'s target — `null` in list mode. */
  editScheduleId: string | null;
  rows: BudgetScheduleRow[];
  status: BudgetSchedulesStatus;
  errorMessage?: string;
  onRetry: () => void;
  /** Stated when the list is genuinely empty — an inline status line, never a centred placard. */
  emptyMessage: string;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  toggleErrorMessage?: string;
  preview: BudgetSchedulePreviewScreen;
  /** `?delete=<id>`'s target, with the typed-confirmation wiring. */
  deleteTarget: { id: string; name: string } | null;
  deleteErrorMessage?: string;
  deleting: boolean;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export const NO_SCHEDULES_MESSAGE =
  'No reset schedules yet. Until one exists, a new billing period starts every account at whatever ' +
  'its last grant left — nothing resets on its own.';

export function useAdminBudgetSchedulesScreen(): AdminBudgetSchedulesScreen {
  const budgetClient = useConsoleBudgetClient();
  // `resolveActorLabels` is a `crud`-scope procedure (`authz.cstack`), so it goes to the authz
  // client, not the budget one — the two proxies have different base paths.
  const authzClient = useConsoleAuthzClient();
  const queryClient = useQueryClient();
  const [view, setView] = useAdminBudgetSchedulesParams();

  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — ephemeral mutation outcomes only this view
  // renders). The preview RESULT is deliberately not in the query cache: it is the answer to "what
  // would happen if I pressed this, right now", and a cached one served after an operator edited
  // the schedule would be a stale plan wearing a fresh label.
  const [runResult, setRunResult] = useState<BudgetResetScheduleRunResult | null>(null);
  const [runErrorMessage, setRunErrorMessage] = useState<string | undefined>(undefined);
  const [toggleErrorMessage, setToggleErrorMessage] = useState<string | undefined>(undefined);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | undefined>(undefined);

  const schedulesQuery = useQuery({
    queryKey: SCHEDULES_QUERY_KEY,
    queryFn: () => budgetClient.procedures.listBudgetResetSchedules({ args: {} }),
    staleTime: 30_000,
  });

  // The FETCH timestamp, not `Date.now()` — the house idiom (`use-refills-queue-screen.ts`,
  // `use-api-keys-screen.ts`): reading the clock during render is impure, and "in 6 h" is relative
  // to when the list was read, not to whenever this component happens to re-render.
  const now = schedulesQuery.dataUpdatedAt;

  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: BILLING_PLANS_QUERY_KEY,
    queryFn: () => authzClient.procedures.listBillingPlans({ args: {} }),
    staleTime: 300_000,
  });

  const schedules = useMemo<BudgetResetSchedule[]>(
    () => schedulesQuery.data ?? [],
    [schedulesQuery.data]
  );

  // The union of every account id this screen has to name — the scoped rows' targets plus whatever
  // the open preview mentions. One batch, not two.
  const accountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const schedule of schedules) {
      if (schedule.scopeKind === 'account' && schedule.scopeId) ids.add(schedule.scopeId);
    }
    if (runResult) for (const id of runResultAccountIds(runResult)) ids.add(id);
    return Array.from(ids);
  }, [schedules, runResult]);

  const labelsQuery = useQuery({
    // Keyed on the ids themselves: the batch's answer IS a function of the id set, and a stable
    // key across two different sets would serve one set's labels for the other's rows.
    queryKey: ['actorLabels', 'accounts', accountIds.join(',')],
    queryFn: () =>
      authzClient.procedures.resolveActorLabels({
        args: { userIds: [], accountIds, projectIds: [] },
      }),
    enabled: accountIds.length > 0,
    staleTime: 300_000,
    // A missing/forbidden identity read must not retry-storm a screen that works fine with ids.
    retry: false,
  });

  const accountLabels = useMemo<ActorAccountLabel[]>(
    () => labelsQuery.data?.accounts ?? [],
    [labelsQuery.data]
  );

  const rows = useMemo(
    () =>
      schedules.map((schedule) =>
        toBudgetScheduleRow(schedule, now, plansQuery.data ?? [], accountLabels)
      ),
    [schedules, now, plansQuery.data, accountLabels]
  );

  const status: BudgetSchedulesStatus = schedulesQuery.isError
    ? 'error'
    : schedulesQuery.isPending
      ? 'loading'
      : 'ready';

  // ── the enabled toggle: optimistic, with a real rollback ────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      budgetClient.procedures.updateBudgetResetSchedule({ args: { id, enabled } }),
    onMutate: async ({ id, enabled }) => {
      setToggleErrorMessage(undefined);
      // Cancel first: an in-flight list refetch landing after this write would overwrite the
      // optimistic row with the pre-toggle server state and make the switch appear to bounce back.
      await queryClient.cancelQueries({ queryKey: SCHEDULES_QUERY_KEY });
      const previous = queryClient.getQueryData<BudgetResetSchedule[]>(SCHEDULES_QUERY_KEY);
      queryClient.setQueryData<BudgetResetSchedule[]>(SCHEDULES_QUERY_KEY, (current) =>
        (current ?? []).map((schedule) =>
          schedule.id === id ? { ...schedule, enabled } : schedule
        )
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      // The switch goes back to where it was, and says why. Leaving it showing a state the backend
      // never accepted is the failure mode the story names explicitly.
      if (context?.previous) queryClient.setQueryData(SCHEDULES_QUERY_KEY, context.previous);
      setToggleErrorMessage(getApiErrorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
    },
  });

  // ── the dry run / real run ──────────────────────────────────────────────────────────────────
  const runMutation = useMutation({
    mutationFn: ({ id, dryRun }: { id: string; dryRun: boolean }) =>
      budgetClient.procedures.runBudgetResetScheduleNow({ args: { id, dryRun } }),
    onMutate: () => {
      setRunErrorMessage(undefined);
      setRunResult(null);
    },
    onSuccess: (result, variables) => {
      setRunResult(result);
      // A real run advanced `nextRunAt`/`lastRunAt` and wrote grants; the list and every balance
      // this session has cached are now stale.
      if (!variables.dryRun) {
        void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ['budget'] });
      }
    },
    onError: (error) => setRunErrorMessage(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetClient.procedures.deleteBudgetResetSchedule({ args: { id } }),
    onSuccess: () => {
      setDeleteErrorMessage(undefined);
      void setView({ deleteScheduleId: '' });
      void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
    },
    onError: (error) => setDeleteErrorMessage(getApiErrorMessage(error)),
  });

  const previewScheduleId = view.previewScheduleId || null;
  const previewSchedule = schedules.find((schedule) => schedule.id === previewScheduleId);
  const previewRow = rows.find((row) => row.id === previewScheduleId);

  const previewStatus: BudgetSchedulePreviewStatus = runErrorMessage
    ? 'error'
    : runMutation.isPending
      ? 'loading'
      : runResult
        ? 'ready'
        : 'idle';

  const runPreview = (id: string) => runMutation.mutate({ id, dryRun: true });

  const deleteTargetSchedule = schedules.find(
    (schedule) => schedule.id === (view.deleteScheduleId || null)
  );

  return {
    mode: view.editScheduleId ? 'edit' : 'list',
    editScheduleId: view.editScheduleId || null,
    rows,
    status,
    errorMessage: schedulesQuery.isError ? getApiErrorMessage(schedulesQuery.error) : undefined,
    onRetry: () => void schedulesQuery.refetch(),
    emptyMessage: NO_SCHEDULES_MESSAGE,

    onEdit: (id) => void setView({ editScheduleId: id }),
    onPreview: (id) => {
      void setView({ previewScheduleId: id });
      runPreview(id);
    },
    onToggleEnabled: (id, enabled) => toggleMutation.mutate({ id, enabled }),
    toggleErrorMessage,

    preview: {
      scheduleId: previewScheduleId,
      title: previewRow ? `Preview — ${previewRow.name}` : 'Preview',
      subtitle: previewRow?.cadence ?? '',
      status: previewStatus,
      // The result's own flag, never the button that was pressed: a sheet showing a real run's
      // outcome must say so even if it was opened as a preview.
      dryRun: runResult ? runResult.dryRun : true,
      windowLabel: runResult?.windowStart,
      entries: runResult ? toPreviewEntries(runResult, accountLabels, PREVIEW_ENTRY_LIMIT) : [],
      totalEntryCount: runResult?.entries.length ?? 0,
      entryLimit: PREVIEW_ENTRY_LIMIT,
      deferredCount: runResult?.deferredAccountIds.length ?? 0,
      supersededCount: runResult?.supersededAccountIds.length ?? 0,
      errorMessage: runErrorMessage,
      onRetry: () => {
        if (previewScheduleId) runPreview(previewScheduleId);
      },
      onClose: () => {
        void setView({ previewScheduleId: '' });
        setRunResult(null);
        setRunErrorMessage(undefined);
      },
      // "Run now is a second confirm after a preview": the real run is only reachable once a DRY
      // run has actually come back, so nobody can fire an estate-wide grant off a button they
      // pressed before seeing what it would do.
      canRunForReal: Boolean(
        previewSchedule && runResult && runResult.dryRun && !runMutation.isPending
      ),
      onRunForReal: () => {
        if (previewScheduleId) runMutation.mutate({ id: previewScheduleId, dryRun: false });
      },
      runningForReal: runMutation.isPending && runMutation.variables?.dryRun === false,
    },

    deleteTarget: deleteTargetSchedule
      ? { id: deleteTargetSchedule.id, name: deleteTargetSchedule.name }
      : null,
    deleteErrorMessage,
    deleting: deleteMutation.isPending,
    onRequestDelete: (id) => {
      setDeleteErrorMessage(undefined);
      void setView({ deleteScheduleId: id });
    },
    onConfirmDelete: () => {
      if (view.deleteScheduleId) deleteMutation.mutate(view.deleteScheduleId);
    },
    onCancelDelete: () => {
      setDeleteErrorMessage(undefined);
      void setView({ deleteScheduleId: '' });
    },
  };
}
