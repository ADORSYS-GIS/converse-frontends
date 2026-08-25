'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import {
  OVERVIEW_EXPORT_RAIL_LABEL,
  OverviewExportRail,
} from '@lightbridge/ui-web/src/sections/overview-export-rail';
import {
  OVERVIEW_SERIES_RAIL_LABEL,
  OverviewSeriesRail,
} from '@lightbridge/ui-web/src/sections/overview-series-rail';

import { RailPanelSkeleton } from '../../../containers/rail-skeleton';

const noop = () => {};

/**
 * `/` right-rail loading skeleton (`@rail` parallel-route slot) — see `(console)/loading.tsx`'s
 * docstring for why this file exists at all.
 *
 * VIEW and FILTERS need live option data (`useOverviewScreen()`'s scope/view-state) this static
 * file has no access to, so they render as generic field skeletons (`RailPanelSkeleton`, matching
 * `RailSelect`'s own geometry). SERIES and EXPORT are rendered with their real components instead:
 * `OverviewRail`'s real usage always passes SERIES an empty `items` array (the spend-series legend
 * has no live query client yet) and EXPORT is a static button with no data dependency at all — so
 * their "loading" appearance and their real appearance are the identical, already-correct render.
 */
export default function OverviewRailLoading() {
  return (
    <>
      <RailPanelSkeleton label="VIEW" fieldCount={3} />
      <RailPanelSkeleton label="FILTERS" fieldCount={3} />
      <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
        <OverviewSeriesRail items={[]} />
      </RailPanel>
      <RailPanel label={OVERVIEW_EXPORT_RAIL_LABEL}>
        <OverviewExportRail onExport={noop} />
      </RailPanel>
    </>
  );
}
