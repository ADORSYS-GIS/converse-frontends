'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import {
  MANAGE_SELECTION_RAIL_LABEL,
  ManageSelectionRail,
} from '@lightbridge/ui-web/src/sections/manage-selection-rail';

import { RailPanelSkeleton } from '../../../../containers/rail-skeleton';

/**
 * `/manage` right-rail loading skeleton — see `@rail/loading.tsx`'s docstring for the same
 * pattern applied to Overview.
 *
 * MONTHLY REPORT and FILTERS need live data this static file has no access to, so they render as
 * generic field skeletons. SELECTION renders its real component with no project selected —
 * `ManageSelectionRail`'s own "No rows selected." line is exactly what the hydrated page shows
 * too, before any ledger row is picked.
 */
export default function ManageRailLoading() {
  return (
    <>
      <RailPanelSkeleton label="MONTHLY REPORT" fieldCount={4} />
      <RailPanelSkeleton label="FILTERS" fieldCount={3} />
      <RailPanel label={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={null} />
      </RailPanel>
    </>
  );
}
