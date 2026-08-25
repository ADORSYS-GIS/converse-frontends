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
      <ReviewDetailRail detail={screen.reviewDetail} />
    </RailPanel>
  );
}
