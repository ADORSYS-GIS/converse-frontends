// The geometry of a read-only fact block: a subject line with its action, and under it a list of
// `label`-term / value rows on one baseline each.
//
// Declared here rather than in the two sections that render it because it IS the shape, repeated:
// the Settings screen shows one such block for the account and one per project, and
// `ManageSelectionRail` already renders the same term/value pair for the row it targets. daisy
// ships no definition-list primitive at all (`stat` is rejected in PRIMITIVES.md — a bordered,
// centred card), so this geometry is hand-written by necessity; the point of the module is that
// it is hand-written exactly once, and that the two sections consuming it therefore declare no
// classes of their own.
//
// `items-baseline`, not `items-center`: term and value are different type roles at different
// sizes (`label` 11px against `row` 12px), and centring them sits the two texts on baselines a
// pixel apart — invisible on one row, a visible wobble down a column of six.
//
// Spacing is the console's own scale (4 · 8 · 12 · 16 · 20 · 24): 4 between rows of one block,
// 12 between a block's subject line and its rows, 24 between blocks.

/**
 * A whole fact section: several blocks stacked, capped to a readable measure.
 *
 * The cap is the one judgement call in this file, and it is load-bearing. A term/value row is
 * `justify-between`, which is right in a 280px rail (where `ManageSelectionRail` established the
 * shape) and wrong on the 872px centre floor: at full width the label sits against the left edge
 * and its value against the right, ~700px apart, and the eye stops being able to pair them —
 * verified on screen at 1400px before this cap existed. 560px keeps the longest real value
 * (`adorsys-gis/research`, mono) and its label in one glance.
 *
 * `max-w-`, not `w-`, so this is still fluid: below 560 the section is simply the column's width.
 * It is not the banned fixed-width page wrapper — the shell and the page view stay `w-full`; this
 * caps a FORM's measure, which is the one thing on a settings screen that must not stretch.
 */
export const DETAIL_SECTION_CLASS = 'flex max-w-[560px] flex-col gap-6';

/** One block: its subject line, then its rows. */
export const DETAIL_GROUP_CLASS = 'flex flex-col gap-3';

/** The rows of one block. */
export const DETAIL_LIST_CLASS = 'flex flex-col gap-1';

/**
 * One term/value row — and the subject line above them, which is the same shape (a name on the
 * left, its action on the right) at a different type role.
 */
export const DETAIL_ROW_CLASS = 'flex items-baseline justify-between gap-3';
