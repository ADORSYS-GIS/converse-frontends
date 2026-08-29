'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { ReviewDetailRail } from '@lightbridge/ui-web/src/sections/review-detail-rail';

import { useAdminSectionParam } from '../client/url-state';
import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin` — the right rail, delivered through the `@rail` parallel-route slot.
 *
 * One unlabelled `RailPanel`, matching admin-budget-review.svg: the review detail is the whole
 * rail, so it carries no section heading of its own.
 *
 * **Only the refill-review section has a rail.** The admin overview's content does not retarget on
 * a selection, so by the console-ui rail rule it is a toolbar screen, not a rail screen, and its
 * parameters live in the left rail's secondary section instead. This returns `null` there; the
 * shell layout independently declines to reserve the 280px column, because a slot rendering `null`
 * is still a truthy React element and would otherwise leave an empty column behind.
 */
export function AdminRail() {
  const [section] = useAdminSectionParam();

  if (section !== 'refills') return null;
  return <AdminReviewRail />;
}

function AdminReviewRail() {
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
