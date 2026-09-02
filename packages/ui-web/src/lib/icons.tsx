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
function IconBase({ children, className }: { children: React.ReactNode; className?: string }) {
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

/** API keys — a conventional 45deg key: a round bow, a straight shaft, two teeth perpendicular
 *  to it near the bit. The previous path's "teeth" (`M10.5 5.5 12.5 3.5M9 7l1.5-1.5`) were two
 *  segments COLLINEAR with the shaft itself (`M6.8 9.2 12.5 3.5`, also exactly 45deg) rather than
 *  perpendicular to it, so they painted no visible tooth at all — just a longer, doubled-over
 *  line on top of the shaft, reading as a balloon on a stick rather than a key (owner review,
 *  2026-08-30 — "the key (lopsided)"). The bow and shaft are unchanged (both were already correct
 *  — same centre/radius, same 45deg line); only the two teeth are redrawn, each a short stroke
 *  perpendicular to the shaft at a point along it. */
export function KeysIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="11" r="2.5" />
      <path d="M6.8 9.2 12.5 3.5" />
      <path d="M9.5 6.5 10.6 7.6M11 5 12.2 6.2" />
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

/** Settings area — Accounts (IA v3 phase E): two overlapping cards, the "account family" glyph
 *  (ADR-0026 — one identity may own several accounts), distinct from `RolesIcon`'s people and
 *  `ProjectsIcon`'s single folder. */
export function AccountsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="4.5" width="9" height="7" rx="1" />
      <path d="M5 4.5V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1.5" />
    </IconBase>
  );
}

/** Operator / admin, and (IA v3 phase 2) the settings area's "Refills queue" entry — a shield. */
export function AdminIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 2 3 4v4c0 3.5 2.5 5.3 5 6 2.5-.7 5-2.5 5-6V4L8 2Z" />
    </IconBase>
  );
}

/** Settings area — Roles: two people, the roster-and-permissions glyph. */
export function RolesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5.5" cy="5" r="2" />
      <path d="M2 13.5c0-2.2 1.6-3.5 3.5-3.5s3.5 1.3 3.5 3.5" />
      <circle cx="11" cy="5.5" r="1.5" />
      <path d="M10.5 8.3c1.6.2 2.7 1.4 2.7 3.2" />
    </IconBase>
  );
}

/** Settings area — Tier configs: three stacked bars of increasing width. */
export function TiersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 3h6M3.5 8h9M2 13h12" />
    </IconBase>
  );
}

/** Settings area — Project policies: a document with a checked line, the governance glyph for
 *  the project model-policy/allowed-models controls the screen edits. */
export function PoliciesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 2h5.5L12 4.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M5.5 8.2 7 9.7 10.5 6.2" />
    </IconBase>
  );
}

/** Settings area — Refill options policies: a gauge, the budget-rule glyph. */
export function RefillOptionsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11.5a5 5 0 0 1 10 0" />
      <path d="M8 11.5 10.3 7" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/**
 * Admin area — Budget schedules (converse-frontends#451): a clock face, the recurrence glyph.
 *
 * Deliberately NOT `RefillOptionsIcon`'s gauge, and not a variant of it: a refill policy decides
 * whether to grant when someone ASKS, a reset schedule grants on a CLOCK whether or not anyone
 * asks. Two neighbouring nav rows wearing the same glyph family would say those are the same kind
 * of thing, which is precisely the confusion this feature is easiest to fall into.
 */
export function ScheduleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.8" />
    </IconBase>
  );
}

/** Settings area — Info: a lowercase "i" in a circle. */
export function InfoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.3v4M8 5.2v.1" />
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

/** Expand — `DashboardPanel`'s zoom affordance (converse-frontends#446, decision D-E): two
 *  opposite corner brackets with an arrow into each, the conventional "make this bigger" mark.
 *  Drawn in the same 16-unit box at the same 1.5 stroke as every glyph here, so a panel's heading
 *  action reads as the same family as a nav row's icon. */
export function ExpandIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 2.5h4v4M13.5 2.5 9.25 6.75" />
      <path d="M6.5 13.5h-4v-4M2.5 13.5l4.25-4.25" />
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

/** Sign out — a door frame with an arrow exiting through it. The left rail identity row's own
 *  trailing action (owner ruling, 2026-08-31, issue #368: sign-out is a row-scoped action, not a
 *  menu item behind a dropdown any more — `AccountMenu` is deleted). */
export function SignOutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 2.5h-4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4" />
      <path d="M6.5 8h6.5M13.5 8 11 5.5M13.5 8 11 10.5" />
    </IconBase>
  );
}

/** Back — a plain leftward arrow, the `settings`/`admin` areas' own "Back to console" row
 *  (`apps/console/src/client/console-chrome.tsx`'s `BackToConsoleRow`/`BackToConsoleCompact`).
 *  Owner review round 2 (2026-08-31, converse-frontends#368 finding #2, verbatim): "'Back to
 *  console' is coupled to the arrow left icon. It should have the same distance as the other menu
 *  items. I mean, technically it's also a menu item right?" — the row used to draw its "←" as a
 *  literal character INSIDE the label text, so nothing reserved the icon column every nav/footer
 *  row's glyph sits in and the label started flush against the row's own padding instead of the
 *  shared label x. This glyph is what now sits in that column instead, mirror-imaged off
 *  `SignOutIcon`'s own exit arrow (same door-adjacent vocabulary, opposite direction — leaving
 *  the row's own affordance is "in", this row's is "out, back to console"). */
export function BackIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 8h9.5M6 4.5 2.5 8 6 11.5" />
    </IconBase>
  );
}
