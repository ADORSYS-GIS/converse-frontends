import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { DateRangeField } from '../../components/date-range-field';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { OverviewControlsProps } from './types';

// The Overview screen's parameters, stacked in the LEFT rail beneath the nav (owner, 2026-08-29).
//
// They were briefly a horizontal strip in the content column, which was wrong twice over: it ate
// the top of the screen for chrome, and it ignored a 208px rail that was already reserved and
// 80% empty. One rail now carries navigation AND the screen's controls; the content column is
// content only, full width.
//
// Not here, deliberately: Account (identity — the header's `AccountBadge`) and Series (the chart
// draws its own legend, and the share bar lists the same series again).
export function OverviewControls({
  rangeField,
  bucketField,
  groupByField,
  projectField,
  modelField,
  onExport,
  exportLabel = 'Export CSV',
  exportDisabledReason,
  className,
}: OverviewControlsProps) {
  return (
    <section aria-label="View and filters" className={cn('flex flex-col gap-4', className)}>
      <DateRangeField {...rangeField} />
      <SelectField {...bucketField} />
      <SelectField {...groupByField} />
      {/* Omitted entirely, never rendered disabled — see `OverviewControlsProps.projectField`. */}
      {projectField ? <SelectField {...projectField} /> : null}
      {modelField ? <SelectField {...modelField} /> : null}

      {onExport || exportDisabledReason ? (
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!onExport}
            title={exportDisabledReason}
            onClick={onExport}>
            {exportLabel}
          </Button>
          {!onExport && exportDisabledReason ? (
            <span className={LABEL_CLASS}>{exportDisabledReason}</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
