import React, { forwardRef } from 'react';

import { cn } from '../../cn';
import { RAIL_SECTION_LABEL_CLASS, RAIL_SECTION_PADDING_CLASS } from '../../lib/rail-grid';
import type { RailPanelProps } from './types';

// Contract (revised, owner 2026-08-25 — console-ui skill "Rails are flush, aligned, full-height
// columns", supersedes the earlier "floating card" reading of README §4): RailPanel is a rail
// *section*, not a self-panelled card. It owns only the 16px inset and the optional label
// heading — no background, no radius, no shadow of its own. The panel surface fill and the
// edge-to-edge geometry belong to the rail COLUMN that hosts one or more sections (ConsoleShell's
// LEFT_RAIL_CLASS / RIGHT_RAIL_CLASS, BottomSheet's content area): the column supplies the fill
// plus the divider that separates consecutive sections with a single hairline rule, so this
// component never draws its own top/bottom border — which would double the line where two
// sections meet.
//
// NO UPSTREAM (PRIMITIVES.md): daisy has no flush full-height rail-section primitive, and its
// `card` is rejected outright. Both classes this component applies are therefore hand-written by
// necessity — and both are imported, not declared: the inset and the label offset are two halves
// of one alignment grid that lives in lib/rail-grid.ts, and the whole reason that file exists is
// that they drifted apart when each component owned its own copy.
export const RailPanel = forwardRef<HTMLDivElement, RailPanelProps>(function RailPanel(
  { className, label, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn(RAIL_SECTION_PADDING_CLASS, className)} {...props}>
      {/* RAIL_SECTION_LABEL_CLASS lands the label at the SAME shared x every nav/sub-nav row
          label lands at — not at the raw section inset — so section headings read as part of the
          same aligned text column as the rows beneath them. */}
      {label ? <div className={RAIL_SECTION_LABEL_CLASS}>{label}</div> : null}
      {children}
    </div>
  );
});
