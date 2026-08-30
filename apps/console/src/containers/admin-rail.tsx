'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ReviewDetailRail } from '@lightbridge/ui-web/src/sections/review-detail-rail';

import { useAdminSectionParam } from '../client/url-state';
import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin`'s right-hand review-detail panel — rendered inline inside `AdminCentre`'s own
 * `<aside>` at `lg`, refills section only (shell revamp phase 2: the `@rail` parallel-route slot
 * this used to fill is deleted along with `RailPanel`; `Card` is the console's one generic panel
 * now). // phase-3 removes: the whole right-hand aside pattern is temporary.
 *
 * One unlabelled `Card`, matching admin-budget-review.svg: the review detail is the whole panel,
 * so it carries no title of its own.
 *
 * **Only the refill-review section has one.** The admin overview's content does not retarget on a
 * selection, so by the console-ui rail rule it is a toolbar screen, not a rail screen, and its
 * parameters live in `PageHeader.controls` instead (see `admin-overview-centre.tsx`). This returns
 * `null` there — `admin-centre.tsx` only renders the aside at all on the refills section.
 */
export function AdminRail() {
  const [section] = useAdminSectionParam();

  if (section !== 'refills') return null;
  return <AdminReviewRail />;
}

function AdminReviewRail() {
  const screen = useAdminScreen();

  return (
    <Card>
      {/* Keyed by selection: converse-frontends#322's decline-note validation is local state
          scoped to the selected request (`ReviewDetailPanel`'s `noteMissing`) — a `key` forces a
          fresh instance on every new selection instead of carrying a stale validation flag from
          the previous request onto this one. */}
      <ReviewDetailRail key={screen.selectedRequestId ?? 'none'} detail={screen.reviewDetail} />
    </Card>
  );
}
