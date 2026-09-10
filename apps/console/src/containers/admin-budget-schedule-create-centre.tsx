'use client';

import React from 'react';

import { BudgetScheduleFormView } from './budget-schedule-form-view';
import { useBudgetScheduleFormScreen } from './use-budget-schedule-form-screen';

/**
 * `/admin/budget-schedules/create` (converse-frontends#451, story C8) — its own route segment
 * rather than a `?create=true` param, mirroring the owner's round-2 ruling on
 * `/admin/refill-policies/create` (2026-08-31, converse-frontends#368 finding #4) rather than
 * re-litigating it for a second admin form.
 *
 * `useBudgetScheduleFormScreen(null)` is the SAME hook `?edit=<id>` uses — see its own doc comment
 * for why one hook serves both here where the refill-policy route needs two.
 */
export function AdminBudgetScheduleCreateCentre() {
  const form = useBudgetScheduleFormScreen(null);
  return <BudgetScheduleFormView form={form} />;
}
