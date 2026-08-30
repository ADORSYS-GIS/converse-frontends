import React from 'react';

import { RAIL_ICON_SIZE, RAIL_ICON_STROKE_WIDTH } from './rail-grid';

// The console's ONE inline-SVG icon set (phase 9 — owner: "redraw the current odd glyphs … as a
// coherent inline-SVG set in one file"). Before this, the sidebar's nav glyphs
// (`apps/console/src/client/console-chrome.tsx`'s deleted `NavGlyph`) and the overview stat
// cards' glyphs (`sections/overview-stat-row`) were each drawn ad hoc, at different sizes
// (10x10, 12x12), different stroke widths (1, 1.2) and unrelated corner styles — which is
// exactly the "odd glyphs" the owner's review flagged. Every icon here shares:
//
//  - the SAME 16x16 box (`RAIL_ICON_SIZE`, `lib/rail-grid.ts` — the rail grid's own icon-column
//    width, so the glyph box and the column it sits in cannot drift into two different "16px"),
//  - the SAME 1.5 stroke (`RAIL_ICON_STROKE_WIDTH`), round caps/joins throughout,
//  - a 16-unit viewBox, so every path below is drawn in the same coordinate space.
//
// Structural markers, never decoration (console-ui skill) — every icon is `aria-hidden`, and the
// row/button it sits in carries the real accessible name.
function IconBase({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      width={RAIL_ICON_SIZE}
      height={RAIL_ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={RAIL_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}>
      {children}
    </svg>
  );
}

export type IconProps = { className?: string };

/** Overview — an ascending bar chart. */
export function OverviewIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 13V8m3.5 5V4.5m3.5 8.5V6.5M13.5 13V3" />
    </IconBase>
  );
}

/** Projects — a folder. */
export function ProjectsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 4.5h4l1.5 1.5H14v6a1 1 0 0 1-1 1H2.5a.5.5 0 0 1-.5-.5v-8Z" />
    </IconBase>
  );
}

/** API keys — a key. */
export function KeysIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="11" r="2.5" />
      <path d="M6.8 9.2 12.5 3.5M10.5 5.5 12.5 3.5M9 7l1.5-1.5" />
    </IconBase>
  );
}

/** Settings — two sliders, each with a knob at a different position. */
export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 5h5M9.5 5H14M2 11h7.5M11 11h3" />
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="9.5" cy="11" r="1.5" />
    </IconBase>
  );
}

/** Operator / admin — a shield. */
export function AdminIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 2 3 4v4c0 3.5 2.5 5.3 5 6 2.5-.7 5-2.5 5-6V4L8 2Z" />
    </IconBase>
  );
}

/** Search — a magnifier, the sidebar footer's search row. */
export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13.5 13.5 10.3 10.3" />
    </IconBase>
  );
}

/** A single sort chevron — `LedgerTable`'s active-column caret, pointing the sort direction. */
export function SortChevronIcon({
  direction,
  className,
}: IconProps & { direction: 'asc' | 'desc' }) {
  return (
    <IconBase className={className}>
      <path d={direction === 'asc' ? 'M4 9.5 8 5.5 12 9.5' : 'M4 6.5 8 10.5 12 6.5'} />
    </IconBase>
  );
}

/** The inactive sort hint — a subtle up/down chevron pair, shown only until a column is sorted or
 *  hovered (`ledger-sort-caret`'s own opacity/colour states carry the "until engaged" half). */
export function SortNeutralIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5 8 3 12 6.5M4 9.5 8 13 12 9.5" />
    </IconBase>
  );
}
