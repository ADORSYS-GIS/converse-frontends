import React from 'react';

import { cn } from '../../cn';
import { RailSelect } from '../../components/rail-select';
import type { OverviewViewRailProps } from './types';

/**
 * The heading this section carries wherever it is mounted — in a `RailPanel` at `lg`, or as a
 * `SectionSheet` title below it. Exported so the two mount points never drift apart, and so a
 * rail section never renders its own `RailPanel` (which would double the heading inside a sheet).
 */
export const OVERVIEW_VIEW_RAIL_LABEL = 'VIEW';

// Contract: docs/design/console-redesign/README.md §5.1 — the right rail's VIEW section: the
// three controls that decide what the SPEND chart is a picture *of* (range, bucket, group-by).
// Presentational only: values and change callbacks arrive as props.
//
// The `<section aria-label>` is the a11y region landmark; the visible heading comes from whatever
// hosts this (a `RailPanel` label at `lg`, the sheet header below it).
export function OverviewViewRail({
  rangeField,
  bucketField,
  groupByField,
  className,
}: OverviewViewRailProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)} aria-label="View">
      <RailSelect {...rangeField} />
      <RailSelect {...bucketField} />
      <RailSelect {...groupByField} />
    </section>
  );
}
