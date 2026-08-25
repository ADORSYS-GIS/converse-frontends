import React from 'react';

import { cn } from '../../cn';
import { ReviewDetailPanel } from '../../components/review-detail-panel';
import type { ReviewDetailRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const REVIEW_DETAIL_RAIL_LABEL = 'REVIEW';

// Contract: docs/design/console-redesign/README.md §5.4 (admin-budget-review.svg) — the right
// rail's review detail, retargeted to the selected request. `ReviewDetailPanel` already owns the
// whole decision surface (consumption meter, requester note, history, the note field and the
// Approve/Decline pair), so this section composes it and adds only the rail identity plus the
// unselected state.
//
// Selection-driven: below `lg` this is reached through `SelectionSheet`, never a trigger button —
// there is only one queue table, and the same `onSelectRequest` fires at every tier.
export function ReviewDetailRail({ detail, className }: ReviewDetailRailProps) {
  if (!detail) {
    return (
      <p className={cn('font-sans text-[11px] text-subtle', className)}>
        Select a request to review it.
      </p>
    );
  }

  return <ReviewDetailPanel {...detail} className={cn(detail.className, className)} />;
}
