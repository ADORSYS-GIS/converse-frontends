'use client';

import { OverviewControls } from '@lightbridge/ui-web/src/sections/overview-controls';
import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';

import { OVERVIEW_EXPORT_UNAVAILABLE_CAPTION, useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the Overview parameters, in the LEFT rail beneath the nav.
 *
 * Reads `useOverviewScreen()` directly, exactly as the centre does: both issue the same `useList`
 * / `useQuery` keys, so TanStack serves them from one request, and the values they share live in
 * the query string (ADR 0011) rather than in a provider.
 */
export function OverviewControlsRail() {
  const screen = useOverviewScreen();

  return (
    <RailPanel label="View">
      <OverviewControls
        rangeField={screen.rangeField}
        bucketField={screen.bucketField}
        groupByField={screen.groupByField}
        projectField={screen.projectField}
        modelField={screen.modelField}
        exportDisabledReason={OVERVIEW_EXPORT_UNAVAILABLE_CAPTION}
      />
    </RailPanel>
  );
}
