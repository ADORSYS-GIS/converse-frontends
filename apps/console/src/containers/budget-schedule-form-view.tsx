'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { BudgetScheduleForm } from '@lightbridge/ui-web/src/sections/budget-schedule-form';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import React from 'react';

import type { BudgetScheduleFormScreen } from './use-budget-schedule-form-screen';

/**
 * The budget-schedule create/edit form's view — shared by TWO routes
 * (converse-frontends#451, story C8), exactly the way `RefillPolicyFormView` is shared one route
 * over: `/admin/budget-schedules/create` and `/admin/budget-schedules?edit=<id>`.
 *
 * It takes the screen object rather than the whole mode dispatch because the create route has no
 * mode to dispatch on — its hook returns this shape directly.
 */
export function BudgetScheduleFormView({ form }: { form: BudgetScheduleFormScreen }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={form.title}
        subtitle={form.subtitle}
        action={
          <Button type="button" variant="ghost" size="sm" onClick={form.onCancel}>
            Cancel
          </Button>
        }
      />

      <Card>
        {form.loadError ? (
          <ErrorLine message={form.loadError} />
        ) : form.loading ? (
          // A skeleton, not a blank draft: an empty form under an "Edit …" title reads as a
          // schedule whose fields are genuinely empty.
          <SkeletonMetric width={220} />
        ) : (
          <>
            {/* Saving would overwrite a field this console could not render — stated before the
                form, not after the save. */}
            {form.unknownFieldsNote ? (
              <ErrorLine message={form.unknownFieldsNote} className="mb-4" />
            ) : null}

            <BudgetScheduleForm
              value={form.value}
              onChange={form.onChange}
              errors={form.errors}
              formMode={form.mode}
              billingPlans={form.billingPlans}
            />

            {form.submitError ? <ErrorLine message={form.submitError} className="mt-4" /> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                disabled={!form.canSubmit}
                onClick={form.onSubmit}>
                {form.submitting
                  ? 'Saving…'
                  : form.mode === 'edit'
                    ? 'Save changes'
                    : 'Create schedule'}
              </Button>
              {form.mode === 'create' ? (
                <InlineStatus>
                  Preview it from the list before enabling it — a dry run writes nothing.
                </InlineStatus>
              ) : null}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
