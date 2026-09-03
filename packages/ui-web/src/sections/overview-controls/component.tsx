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
  // Phase 9 (owner: kills the "Group by Project Project All projects" stutter) — no external
  // label beside any of these: each control self-describes through its OWN chosen value ("Last
  // 30 days", "Daily", "By project", a project's name), the way a setting reads in every
  // reference this shell is modelled on. The `label` prop each field still carries is not gone —
  // it stays the field's real accessible name (`hideLabel` only hides it visually), which is why
  // `OverviewControlsField`/`DateRangeFieldProps` keep requiring one.
  return (
    <section
      aria-label="View and filters"
      className={cn('flex flex-wrap items-end gap-3', className)}>
      <DateRangeField {...rangeField} layout="inline" hideLabel />
      <SelectField {...bucketField} layout="inline" hideLabel />
      <SelectField {...groupByField} layout="inline" hideLabel />
      {/* Omitted entirely, never rendered disabled — see `OverviewControlsProps.projectField`. */}
      {projectField ? <SelectField {...projectField} layout="inline" hideLabel /> : null}
    </section>
  );
}
