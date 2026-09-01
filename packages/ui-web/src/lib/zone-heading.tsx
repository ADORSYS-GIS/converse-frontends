import React from 'react';

import { SECTION_TITLE_CLASS } from './type-roles';

/**
 * The label row at the top of a dashboard zone (console-redesign §5.1): the zone's name, and
 * whatever the zone puts at the trailing edge of that line.
 *
 * `SpendDashboard`, `LatencyDashboard` and `BudgetPanel` each wrote this out byte for byte —
 * label div, `justify-between` row, conditional action cluster — and `SpendShareSection` wrote out
 * the baseline-aligned variant. Four independent chances to disagree about the heading that is
 * supposed to make the zones read as one family. Paint is `theme.css`'s `zone-heading`.
 *
 * `actions` and `trailing` are separate props rather than one slot because they align differently
 * and the difference is not the caller's to pick: a cluster of buttons centres against the label,
 * while a figure is the other half of the label's own sentence and must sit on its baseline.
 */
export interface ZoneHeadingProps {
  label: React.ReactNode;
  /** Controls for the zone — a compact-tier sheet trigger, a filter. Centred, tight cluster. */
  actions?: React.ReactNode;
  /** A figure the zone's heading states, e.g. the share zone's total. Baseline-aligned. */
  trailing?: React.ReactNode;
}

export function ZoneHeading({ label, actions, trailing }: ZoneHeadingProps) {
  return (
    <div className="zone-heading" data-align={trailing ? 'baseline' : undefined}>
      <div className={SECTION_TITLE_CLASS}>{label}</div>
      {trailing ?? (actions ? <div className="zone-heading-actions">{actions}</div> : null)}
    </div>
  );
}
