'use client';

import { formatMoney } from '@lightbridge/ui-web/src/lib/money';
import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import {
  OVERVIEW_EXPORT_RAIL_LABEL,
  OverviewExportRail,
} from '@lightbridge/ui-web/src/sections/overview-export-rail';
import {
  OVERVIEW_FILTERS_RAIL_LABEL,
  OverviewFiltersRail,
} from '@lightbridge/ui-web/src/sections/overview-filters-rail';
import {
  OVERVIEW_SERIES_RAIL_LABEL,
  OverviewSeriesRail,
} from '@lightbridge/ui-web/src/sections/overview-series-rail';
import {
  OVERVIEW_VIEW_RAIL_LABEL,
  OverviewViewRail,
} from '@lightbridge/ui-web/src/sections/overview-view-rail';

import { OVERVIEW_EXPORT_UNAVAILABLE_CAPTION, useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the Overview right rail, delivered through the `@rail` parallel-route slot.
 *
 * A Fragment, not a wrapping `<div>`: `ConsoleShell`'s rail column applies `bg-surface divide-y
 * divide-raised` to its DIRECT children, so each `RailPanel` has to be a direct DOM child for the
 * hairlines to land between sections instead of around one box (console-ui skill "Rails are
 * flush, aligned, full-height columns").
 *
 * SERIES has no compact-tier trigger and so appears only here: the chart itself already exposes
 * series selection on click, making this legend a convenience echo rather than the only path.
 */
export function OverviewRail() {
  const screen = useOverviewScreen();

  // #305 — echoes the SAME series `SpendShareSection`'s donut plots, in the same key order, so
  // selecting a legend row here and clicking a slice in the centre stay in sync (both drive
  // `screen.selectedSeriesKey`, the URL's own `series` param). Only populated once the underlying
  // usage query has actually resolved (`'ready'`) — while it's loading or has failed there is
  // nothing real to echo yet, and an empty array here just means "nothing to select from right
  // now," not "never wired" (#305/#306's own governing principle: a query in flight or a failure
  // must never be dressed up as a real empty list).
  const seriesItems =
    screen.spendStatus === 'ready'
      ? screen.spendSlices.map((slice) => ({
          key: slice.key,
          label: slice.label,
          value: formatMoney(slice.value),
          breached: slice.breached,
        }))
      : [];

  return (
    <>
      <RailPanel label={OVERVIEW_VIEW_RAIL_LABEL}>
        <OverviewViewRail
          rangeField={screen.rangeField}
          bucketField={screen.bucketField}
          groupByField={screen.groupByField}
        />
      </RailPanel>
      <RailPanel label={OVERVIEW_FILTERS_RAIL_LABEL}>
        <OverviewFiltersRail
          accountField={screen.accountField}
          projectField={screen.projectField}
          modelField={screen.modelField}
        />
      </RailPanel>
      <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
        <OverviewSeriesRail
          items={seriesItems}
          selectedKey={screen.selectedSeriesKey}
          onSelectKey={screen.setSelectedSeriesKey}
        />
      </RailPanel>
      <RailPanel label={OVERVIEW_EXPORT_RAIL_LABEL}>
        {/* CSV export route doesn't exist yet (#308) — disabled with the reason stated beside
            it, never a button that silently no-ops on press (console-ui#324). */}
        <OverviewExportRail disabled caption={OVERVIEW_EXPORT_UNAVAILABLE_CAPTION} />
      </RailPanel>
    </>
  );
}
