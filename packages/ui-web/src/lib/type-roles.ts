// The `label` type role — one definition, consumed everywhere a structural label is rendered.
// Was re-typed in eight places before this file existed.
//
// Sentence case, not uppercase (owner review 2026-08-29): twenty all-caps labels on one screen
// read as twenty things shouting. Dropping `uppercase` also drops the `.09em` tracking that
// existed to make caps legible, and moves the size up one step (lowercase reads smaller at the
// same pixel size). Colour stays `subtle` — labels are never load-bearing.

/** Structural label: form-control labels, rail section headings, table column headers. */
export const LABEL_CLASS = 'font-mono text-[11px] text-subtle';

/** The same role one step up — headings for the dashboard zones on the centre floor. */
export const DASHBOARD_LABEL_CLASS = 'font-mono text-[12px] text-subtle';
