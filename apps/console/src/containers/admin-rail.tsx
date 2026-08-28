'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { ReviewDetailRail } from '@lightbridge/ui-web/src/sections/review-detail-rail';

import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin` — the right rail, delivered through the `@rail` parallel-route slot.
 *
 * One unlabelled `RailPanel`, matching admin-budget-review.svg: the review detail is the whole
 * rail, so it carries no section heading of its own.
 */
export function AdminRail() {
  const screen = useAdminScreen();

  return (
    <RailPanel>
      {/* Keyed by selection: converse-frontends#322's decline-note validation is local state
          scoped to the selected request (`ReviewDetailPanel`'s `noteMissing`) — a `key` forces a
          fresh instance on every new selection instead of carrying a stale validation flag from
          the previous request onto this one. */}
      <ReviewDetailRail key={screen.selectedRequestId ?? 'none'} detail={screen.reviewDetail} />
    </RailPanel>
  );
}
