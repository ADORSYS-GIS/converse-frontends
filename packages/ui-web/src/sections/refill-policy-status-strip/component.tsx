import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SkeletonMetric } from '../../components/skeleton-metric';
import { DATA_INK_CLASS, META_CLASS } from '../../lib/type-roles';
import type { RefillPolicyStatusStripProps } from './types';

/**
 * `/settings/refill-options`'s honest status line: the active policy set id and revision —
 * `getBudgetPolicyStatus`'s own two fields, which genuinely have a read API — as one inline mono
 * line, never a placard, with the real limitation stated right beside it rather than pretended
 * away: the RULE CONTENT of that revision cannot be shown (no read API,
 * `converse-frontends#368`).
 */
const CONTENT_UNREADABLE_CAPTION =
  "This revision's rule content has no read API today — only activation and revision-by-id status exist (converse-frontends#368).";

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
