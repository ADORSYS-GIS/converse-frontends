'use client';

import { getApiErrorMessage } from '@lightbridge/hooks/api-error';
import {
  budgetScheduleUnknownFields,
  createBlankBudgetSchedule,
  formatUtcInstant,
  fromStoredBudgetSchedule,
  toBudgetScheduleWire,
  validateBudgetSchedule,
} from '@lightbridge/ui-web';
import type {
  BillingPlanChoice,
  BudgetScheduleFormErrors,
  BudgetScheduleFormValue,
} from '@lightbridge/ui-web';
import type { BillingPlanInfo, BudgetResetSchedule } from '@lightbridge/authz-rpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useConsoleAuthzClient, useConsoleBudgetClient } from '../client/rpc-clients';

/**
 * The budget-schedule form's data adapter — ONE hook for both routes (converse-frontends#451,
 * story C8): `/admin/budget-schedules/create` calls it with `null`, `/admin/budget-schedules
 * ?edit=<id>` with the id.
 *
 * Deliberately NOT the two-sibling-hooks split `/admin/refill-policies` uses. That route needs two
 * because its edit mode CANNOT prefill at all — there is no read API for stored rule content
 * (converse-frontends#368) — so the two modes genuinely have different data flows. Here they do
 * not: `listBudgetResetSchedules` returns every field of every schedule, so edit is create plus a
 * prefill and a different write call, and two copies of that would be two places for the wire
 * mapping to drift.
 *
 * The prefill is a REAL one. When the stored schedule carries a value this console cannot render
 * (a cadence a newer backend added), `fromStoredBudgetSchedule` falls back to a known default for
 * that one field and `unknownFieldsNote` states exactly which — an operator must never save a form
 * that silently rewrote a field they never touched.
 */

const SCHEDULES_QUERY_KEY = ['budget', 'resetSchedules'] as const;
const BILLING_PLANS_QUERY_KEY = ['billingPlans'] as const;

export interface BudgetScheduleFormScreen {
  mode: 'create' | 'edit';
  title: string;
  subtitle?: string;
  /** The stored schedule is still loading — the form renders its skeleton rather than a blank
   *  draft that would look like a real, empty prefill. */
  loading: boolean;
  /** The `?edit=<id>` target could not be read at all. */
  loadError?: string;
  /** Stated inline when the prefill was lossy — see the module doc comment. */
  unknownFieldsNote?: string;
  value: BudgetScheduleFormValue;
  onChange: (value: BudgetScheduleFormValue) => void;
  errors?: BudgetScheduleFormErrors;
  /**
   * The stored schedule's current window, rendered absolute — edit route only.
   *
   * The "Next execution" control starts EMPTY on edit, because omitting `nextRunAt` on
   * `updateBudgetResetSchedule` is what leaves the stored column alone. This is what stops that
   * from being a decision made blind.
   */
  currentNextRunAt?: string;
  billingPlans: BillingPlanChoice[];
  canSubmit: boolean;
  submitting: boolean;
  submitError?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const LIST_ROUTE = '/admin/budget-schedules';

export function useBudgetScheduleFormScreen(scheduleId: string | null): BudgetScheduleFormScreen {
  const budgetClient = useConsoleBudgetClient();
  const authzClient = useConsoleAuthzClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mode = scheduleId ? 'edit' : 'create';

  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — a pre-submit draft, which must never reach a URL
  // or the browser's history) plus this form's own submit outcome.
  //
  // The draft carries the id it belongs to. That is what makes the prefill below a pure DERIVATION
  // rather than a `setState` inside an effect (which React's own rules forbid — cascading renders):
  // "no draft for THIS target yet" is a value this state can express, so the prefill is just the
  // fallback branch of an expression, evaluated during render like any other derived value.
  const [draft, setDraft] = useState<{
    forId: string | null;
    value: BudgetScheduleFormValue;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  // SANCTIONED LOCAL STATE (ADR 0011 Decision 3) — the clock, read ONCE when the form mounts, in a
  // `useState` initialiser so it is not a read during render. It is not view state and it must not
  // reach the URL. The only rule that needs it is "a forced window must be in the future"; a
  // timestamp minutes old cannot make a genuinely-future instant look past, and the backend
  // re-checks against its own clock at submit and is the authority either way.
  const [openedAt] = useState(() => Date.now());

  // The whole list, not a single-schedule read: there is no `getBudgetResetSchedule` procedure, and
  // the list is unpaginated operator configuration measured in tens of rows. Same query key the
  // list screen uses, so arriving from the list costs no second fetch.
  const schedulesQuery = useQuery({
    queryKey: SCHEDULES_QUERY_KEY,
    queryFn: () => budgetClient.procedures.listBudgetResetSchedules({ args: {} }),
    enabled: mode === 'edit',
    staleTime: 30_000,
  });

  const plansQuery = useQuery<BillingPlanInfo[]>({
    queryKey: BILLING_PLANS_QUERY_KEY,
    queryFn: () => authzClient.procedures.listBillingPlans({ args: {} }),
    staleTime: 300_000,
  });

  const stored: BudgetResetSchedule | undefined =
    mode === 'edit'
      ? schedulesQuery.data?.find((schedule) => schedule.id === scheduleId)
      : undefined;

  /**
   * The form's value: the operator's own draft once they have touched THIS target, and otherwise
   * the prefill.
   *
   * Two properties fall straight out of the `forId` tag rather than needing an effect:
   *  - a background list refetch cannot clobber typed input — once `draft.forId === scheduleId` the
   *    stored copy stops being read at all;
   *  - navigating `?edit=a` → `?edit=b` without a remount cannot carry a's draft onto b — the tag
   *    no longer matches, so b prefills from its own stored row.
   */
  const value =
    draft && draft.forId === scheduleId
      ? draft.value
      : stored
        ? fromStoredBudgetSchedule(stored)
        : createBlankBudgetSchedule();

  const onChange = useCallback(
    (next: BudgetScheduleFormValue) => setDraft({ forId: scheduleId, value: next }),
    [scheduleId]
  );

  const errors = validateBudgetSchedule(value, openedAt);

  const billingPlans = useMemo<BillingPlanChoice[]>(
    () => (plansQuery.data ?? []).map((plan) => ({ id: plan.id, label: plan.name })),
    [plansQuery.data]
  );

  const unknownFields = stored ? budgetScheduleUnknownFields(stored) : [];

  const submitMutation = useMutation({
    mutationFn: () => {
      const wire = toBudgetScheduleWire(value);
      if (scheduleId) {
        // `enabled` rides along on edit because the form owns the toggle there — the list's own
        // optimistic switch writes the same field through the same procedure.
        // `nextRunAt` rides along as `null` when the operator left the field blank, and the
        // generated client omits it — which is exactly the "leave the stored window alone" case.
        return budgetClient.procedures.updateBudgetResetSchedule({
          args: {
            id: scheduleId,
            ...wire,
            nextRunAt: wire.nextRunAt ?? undefined,
            enabled: value.enabled,
          },
        });
      }
      // No `enabled` on create: the procedure has no such field — every schedule is created
      // disabled so a misconfigured global one cannot fire on its first window.
      return budgetClient.procedures.createBudgetResetSchedule({
        args: { ...wire, nextRunAt: wire.nextRunAt ?? undefined },
      });
    },
    onSuccess: () => {
      setSubmitError(undefined);
      void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
      router.push(LIST_ROUTE);
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  });

  const loading = mode === 'edit' && schedulesQuery.isPending;
  const loadError =
    mode === 'edit' && schedulesQuery.isError
      ? getApiErrorMessage(schedulesQuery.error)
      : mode === 'edit' && schedulesQuery.isSuccess && !stored
        ? `No schedule with id ${scheduleId} exists — it may have been deleted since this link was made.`
        : undefined;

  return {
    mode,
    title: mode === 'edit' ? `Edit ${stored?.name ?? 'schedule'}` : 'New budget reset schedule',
    subtitle:
      mode === 'create'
        ? 'A standing rule that writes one grant per matching account, every window.'
        : undefined,
    loading,
    loadError,
    unknownFieldsNote:
      unknownFields.length > 0
        ? `This schedule stores ${unknownFields.join(', ')}, which this console cannot render. Those fields show a default here and SAVING WOULD OVERWRITE THEM.`
        : undefined,
    value,
    onChange,
    errors,
    currentNextRunAt: stored ? formatUtcInstant(stored.nextRunAt) : undefined,
    billingPlans,
    canSubmit: errors === undefined && !submitMutation.isPending && !loading && !loadError,
    submitting: submitMutation.isPending,
    submitError,
    onSubmit: () => submitMutation.mutate(),
    onCancel: () => router.push(LIST_ROUTE),
  };
}
