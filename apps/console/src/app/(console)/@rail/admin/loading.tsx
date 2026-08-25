'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { ReviewDetailRail } from '@lightbridge/ui-web/src/sections/review-detail-rail';

/**
 * `/admin` right-rail loading skeleton — see `@rail/loading.tsx`'s docstring for the same pattern
 * applied to Overview.
 *
 * Renders `ReviewDetailRail`'s real component with no request selected: its own "Select a request
 * to review it." line is exactly what the hydrated page shows too, before any queue row is picked
 * — the same reasoning `ManageRail`'s SELECTION skeleton uses.
 */
export default function AdminRailLoading() {
  return (
    <RailPanel>
      <ReviewDetailRail detail={null} />
    </RailPanel>
  );
}
