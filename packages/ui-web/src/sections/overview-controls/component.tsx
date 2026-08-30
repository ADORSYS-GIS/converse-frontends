import React from 'react';

import { cn } from '../../cn';
import { DateRangeField } from '../../components/date-range-field';
import { SelectField } from '../../components/select-field';
import type { OverviewControlsProps } from './types';

// Shell brief (2026-08-30) — the Overview screen's parameters, now a HORIZONTAL compact cluster in
// `PageHeader.controls` rather than a stack in the left rail: the rail is gone (the sidebar is
// navigation only now), and every screen's own knobs move to its `PageHeader` instead. Every
// field takes `layout="inline"` — label beside a content-sized control — so five fields read as
// one row instead of five stacked columns.
//
// Not here, deliberately: Account (identity — the sidebar's workspace switcher), Model (deleted
// this phase — `MODEL_OPTIONS` was a single, permanently-inert "All models" entry with nothing
// behind it) and Export (deleted this phase — a permanently-disabled action with no real flow;
// export gets wired for real in phase 4, at which point it becomes `PageHeader.action`, not a
// field in this cluster).
export function OverviewControls({
  rangeField,
  bucketField,
  groupByField,
  projectField,
  className,
}: OverviewControlsProps) {
  return (
    <section aria-label="View and filters" className={cn('flex flex-wrap items-end gap-3', className)}>
      <DateRangeField {...rangeField} layout="inline" />
      <SelectField {...bucketField} layout="inline" />
      <SelectField {...groupByField} layout="inline" />
      {/* Omitted entirely, never rendered disabled — see `OverviewControlsProps.projectField`. */}
      {projectField ? <SelectField {...projectField} layout="inline" /> : null}
    </section>
  );
}
