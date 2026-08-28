import React from 'react';

import { cn } from '../../cn';
import { ChartLegend } from '../../components/chart-legend';
import { InlineStatus } from '../../components/inline-status';
import type { OverviewSeriesRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const OVERVIEW_SERIES_RAIL_LABEL = 'SERIES';

const DEFAULT_EMPTY_MESSAGE = 'No series to show.';

// Contract: docs/design/console-redesign/README.md §5.1 — the right rail's SERIES section: a
// `ChartLegend` echo of the SPEND chart's series, selectable.
//
// Deliberately has NO compact-tier `SectionSheetTrigger` of its own: the chart itself already
// exposes series selection directly on click, so this legend is a convenience echo rather than
// the only path to that interaction (console-ui skill "Shape and layout" — a trigger exists
// where the rail section is the only way to reach a parameter, not for every section).
//
// #273 — with zero items this used to render a bare "SERIES" heading over nothing: a blank panel
// with no explanation. `ChartLegend` returning `null` for fewer than two items is otherwise
// correct (a single series needs no legend), but zero items is a distinct case that needs a
// reason, so it's handled here instead of inside `ChartLegend`.
export function OverviewSeriesRail({
  items,
  selectedKey,
  onSelectKey,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  className,
}: OverviewSeriesRailProps) {
  return (
    <section className={cn('flex flex-col gap-3', className)} aria-label="Series">
      {items.length === 0 ? (
        <InlineStatus>{emptyMessage}</InlineStatus>
      ) : (
        <ChartLegend items={items} selectedKey={selectedKey} onSelectKey={onSelectKey} />
      )}
    </section>
  );
}
