import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { DateRangeField } from '../../components/date-range-field';
import { SelectField } from '../../components/select-field';
import type { OverviewToolbarProps } from './types';

// Replaces Overview's entire right rail (VIEW, FILTERS, SERIES, EXPORT) with one horizontal strip
// (owner review 2026-08-29). The skill already described this model below `lg`; promoting it to
// every tier deletes the special case rather than adding one — one arrangement, always visible,
// no SectionSheet on this screen at all.
//
// Not here, deliberately: Account (identity — the header's `AccountBadge`, where it appeared once
// instead of four times) and Series (the chart draws its own legend; the rail section's own
// docstring called it "a convenience echo").

export function OverviewToolbar({
  rangeField,
  bucketField,
  groupByField,
  projectField,
  modelField,
  onExport,
  exportLabel = 'Export CSV',
  exportDisabledReason,
  className,
}: OverviewToolbarProps) {
  return (
    <section
      aria-label="View and filters"
      className={cn('flex flex-wrap items-end gap-x-4 gap-y-3', className)}>
      <DateRangeField layout="inline" {...rangeField} />
      <SelectField layout="inline" {...bucketField} />
      <SelectField layout="inline" {...groupByField} />

      {/* A hairline between "what the chart is a picture of" and "which slice it is drawn from".
          `hidden sm:block` because once the row wraps, a vertical rule mid-wrap is noise. */}
      <span aria-hidden="true" className="bg-border hidden h-[30px] w-px sm:block" />

      <SelectField layout="inline" {...projectField} />
      <SelectField layout="inline" {...modelField} />

      {onExport || exportDisabledReason ? (
        <Button
          type="button"
          variant="secondary"
          className="ml-auto"
          disabled={!onExport}
          title={exportDisabledReason}
          onClick={onExport}>
          {exportLabel}
        </Button>
      ) : null}
    </section>
  );
}
