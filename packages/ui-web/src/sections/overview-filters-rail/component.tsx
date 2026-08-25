import React from 'react';

import { cn } from '../../cn';
import { RailSelect } from '../../components/rail-select';
import type { OverviewFiltersRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const OVERVIEW_FILTERS_RAIL_LABEL = 'FILTERS';

// Contract: docs/design/console-redesign/README.md §5.1 — the right rail's FILTERS section: the
// three controls that decide which slice of usage the dashboards are drawn from.
export function OverviewFiltersRail({
  accountField,
  projectField,
  modelField,
  className,
}: OverviewFiltersRailProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)} aria-label="Filters">
      <RailSelect {...accountField} />
      <RailSelect {...projectField} />
      <RailSelect {...modelField} />
    </section>
  );
}
