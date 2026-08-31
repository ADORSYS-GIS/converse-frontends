import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SkeletonMetric } from '../../components/skeleton-metric';
import { DATA_INK_CLASS, META_CLASS } from '../../lib/type-roles';
import type { RefillPolicyStatusStripProps } from './types';

/**
 * `/admin/refill-policies`'s honest status line (moved from `/settings/refill-options` — refill
 * policies are an admin surface, ADR 0013 amendment): the active policy set id and revision —
 * `getBudgetPolicyStatus`'s own two fields, which genuinely have a read API — as one inline mono
 * line, never a placard, with the real limitation stated right beside it rather than pretended
 * away: the RULE CONTENT of that revision cannot be shown (no read API,
 * `converse-frontends#368`).
 */
const CONTENT_UNREADABLE_CAPTION =
  "This revision's rule content has no read API today — only activation and revision-by-id status exist (converse-frontends#368).";

/** The honest `unavailable` caption for the one real reason this strip has nothing to show: no
 *  `policySetId` has been looked up yet, and no procedure lists which policy sets exist to
 *  default to one (`converse-frontends#368`). Exported so the real container
 *  (`RefillPolicyLookup`'s caller, `apps/console`) and this section's own `fixtures.ts` state the
 *  identical sentence rather than two independently-drifting copies. */
export const NO_POLICY_SET_ID_CAPTION =
  'No known policy set id to check yet — there is no discovery procedure for one today (converse-frontends#368).';

export function RefillPolicyStatusStrip({ state, className }: RefillPolicyStatusStripProps) {
  if (state.status === 'loading') {
    return <SkeletonMetric width={220} className={className} />;
  }

  if (state.status === 'error') {
    return (
      <ErrorLine
        message={state.errorMessage ?? 'Could not load the active policy status.'}
        onRetry={state.onRetry}
        className={className}
      />
    );
  }

  if (state.status === 'unavailable') {
    return <InlineStatus className={className}>{state.caption}</InlineStatus>;
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <p className={DATA_INK_CLASS}>
        Active policy {state.policySetId} · revision {state.activeRevision}
      </p>
      <p className={META_CLASS}>{CONTENT_UNREADABLE_CAPTION}</p>
    </div>
  );
}
