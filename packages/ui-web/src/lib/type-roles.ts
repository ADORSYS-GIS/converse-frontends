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

// The rest of the skill's type roles, given the same one-definition treatment `label` already
// had. Before this, `metric` was re-typed in four components, `row` in five and the two prose
// steps in three — each an independent chance to drift a pixel or a token. daisyUI ships no type
// scale of its own (its `text-*` classes are Tailwind's), so these stay hand-written utilities by
// necessity, not by choice: they are the console's own type contract, declared once.

/** `panel-title` — 16 mono ink. The heading at the top of a rail section or a panel. */
export const PANEL_TITLE_CLASS = 'font-mono text-base text-ink';

/** `metric` — the 22px key numeral. Right-aligned wherever it sits in a column. */
export const METRIC_CLASS = 'font-mono text-[22px] leading-[1.2] text-ink';

/** `metric` at the hero step (26px) — one per screen, the number the page is about. */
export const HERO_METRIC_CLASS = 'font-mono text-[26px] leading-[1.2] text-ink';

/**
 * `row` with no colour — 12 mono. The only consumer that wants this rather than `ROW_CLASS` is a
 * component whose colour is a variant axis (`StatusText`), so the two never disagree on size.
 */
export const ROW_BASE_CLASS = 'font-mono text-xs';

/** `row` — 12 mono body text: table cells, list rows, inline status lines. */
export const ROW_CLASS = `${ROW_BASE_CLASS} text-soft`;

/** `row` in the signal colour — an error line's own text, and nothing decorative. */
export const ROW_SIGNAL_CLASS = `${ROW_BASE_CLASS} text-primary`;

/** `prose` — Inter 11, the only sentence-copy role. */
export const PROSE_CLASS = 'font-sans text-[11px] leading-[1.45] text-soft';

/** `prose` one step down (Inter 10, subtle) — captions and non-load-bearing metadata. */
export const PROSE_META_CLASS = 'font-sans text-[10px] leading-[1.45] text-subtle';

/**
 * The `meta` role — 11px mono, `subtle`: a secondary line under a control or beside a row.
 * Same size and colour as `label`, but with the leading a wrapping sentence needs; a label is
 * one word above a field, a meta line is a clause that can run to two lines.
 */
export const META_CLASS = 'font-mono text-[11px] leading-[1.4] text-subtle';

/**
 * The subject line of a fact block — 14 mono `ink`: an account's name above its id, a project's
 * name above its settings rows. Sits between `panel-title` (a zone heading) and `row` (a value):
 * it is the thing the block is ABOUT, not the block's own heading and not one of its values.
 *
 * Already rendered by hand in `AccountPanel` and `ManageSelectionRail` before this existed —
 * declared here so the third and fourth consumers inherit it rather than re-typing it.
 */
export const SUBJECT_CLASS = 'font-mono text-sm text-ink';
