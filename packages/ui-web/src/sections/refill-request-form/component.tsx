import React from 'react';

import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SelectField } from '../../components/select-field';
import { SkeletonMetric } from '../../components/skeleton-metric';
import { META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import type { RefillRequestFormProps } from './types';

/**
 * `/accounts/<id>/refill`'s own amount-choice card (IA v3 phase 3 — refill moved from
 * `RequestRefillDialog` to its own page). Ported from the deleted dialog's body verbatim: one
 * `SelectField` over the active policy's allowed amounts, one explainer, one submit.
 *
 * NO requester-note field: `RequestBudgetRefillInput` (authz-budget) carries no such column, and
 * there is no other honest place to source one from (lightbridge-authz#559 — the backend gap;
 * this is a comment recording it, not a fabricated field standing in for it).
 */
export function RefillRequestForm({ state, className }: RefillRequestFormProps) {
  return (
    <div className={className}>
      <ZoneHeading label="Refill amount" />
      <div className="mt-4">
        {state.status === 'loading' ? (
          <SkeletonMetric width={160} />
        ) : state.status === 'error' ? (
          <ErrorLine
            message={state.errorMessage ?? 'Could not load the refill policy.'}
            onRetry={state.onRetry}
          />
        ) : state.status === 'unavailable' || state.status === 'empty' ? (
          <InlineStatus>{state.caption}</InlineStatus>
        ) : (
          <div className="flex flex-col gap-3">
            <SelectField
              label="Amount"
              value={state.amountMicros}
              options={state.amountOptions}
              onChange={state.onAmountChange}
            />
            <p className={META_CLASS}>
              This sends the account an augmentation request an operator reviews and approves or
              declines — it does not change the budget itself. Amounts come from the account&rsquo;s
              active refill policy alone.
            </p>
            {state.error ? <ErrorLine message={state.error} /> : null}
            <div>
              <Button
                type="button"
                variant="primary"
                disabled={!state.canSubmit || state.submitting}
                onClick={state.onSubmit}>
                {state.submitting ? 'Requesting…' : 'Request refill'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
