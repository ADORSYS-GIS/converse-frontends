import React from 'react';

import { DateRangeField } from '../../components/date-range-field';
import { SelectField } from '../../components/select-field';
import type { OverviewControlsProps } from './types';

// The Overview screen's parameters — range, bucket, group-by, project.
//
// 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): this is a
// FRAGMENT now, not a `<section>` with its own `flex flex-wrap items-end gap-3`. Those four
// utilities were spelled identically in this file, `ApiKeysControls`, `ManageControls` and
// `SessionLedgerControls`, and the row they described is `PageControls` — the page-level control
// row on the floor between `PageHeader` and the first `Card`. A caller drops this cluster into one
// `PageControlsGroup` and the row owns the geometry, the hairline that parts it from the next
// group, and the group's accessible name.
//
// Not here, deliberately: Account (identity — the sidebar's workspace switcher) and Export (a
// page-level action, so `PageHeader.action` or a trailing `PageControls` group, never a field in
// this cluster).
export function OverviewControls({
  rangeField,
  bucketField,
  groupByField,
  projectField,
}: OverviewControlsProps) {
  // Phase 9 (owner: kills the "Group by Project Project All projects" stutter) — no external
  // label beside any of these: each control self-describes through its OWN chosen value ("Last
  // 30 days", "Daily", "By project", a project's name), the way a setting reads in every
  // reference this shell is modelled on. The `label` prop each field still carries is not gone —
  // it stays the field's real accessible name (`hideLabel` only hides it visually), which is why
  // `OverviewControlsField`/`DateRangeFieldProps` keep requiring one.
  return (
    <>
      <DateRangeField {...rangeField} layout="inline" hideLabel />
      <SelectField {...bucketField} layout="inline" hideLabel />
      <SelectField {...groupByField} layout="inline" hideLabel />
      {/* Omitted entirely, never rendered disabled — see `OverviewControlsProps.projectField`. */}
      {projectField ? <SelectField {...projectField} layout="inline" hideLabel /> : null}
    </>
  );
}
