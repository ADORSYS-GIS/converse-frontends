// The `label` type role — ONE definition, consumed everywhere a structural label is rendered.
//
// Before this file the identical treatment was re-typed in eight places (`dashboard-label.ts`'s
// two constants, `field-classes.ts`, `rail-grid.ts`, and inline copies in `StatCard`,
// `LedgerTable`, `ConsoleShell`, `CommandPalette`, `AccountMenu`, `BottomSheet`), so changing the
// role meant finding all eight — exactly the duplicated-list failure mode that let the rail
// insets drift before `rail-grid.ts` existed. Labels are a type role, not a per-component
// decision; they live here.
//
// **Sentence case, not uppercase** (owner review 2026-08-29). The previous role was
// `10px uppercase tracking-[.09em]`. Individually that reads as restraint; at the density the
// console actually reaches — twenty labels on Overview, ten in the right rail alone — twenty
// simultaneous all-caps strings read as twenty things shouting for the same attention, which is
// precisely the "dense" the owner reported. Sentence case demotes a label back to what it is:
// the quiet name of the thing below it.
//
// Two deliberate consequences of dropping `uppercase`:
//
//  1. **Tracking goes back to normal.** The `.09em` letter-spacing existed to make all-caps
//     legible (caps have no x-height variation to help the eye segment words). Sentence case
//     needs no such help and looks loose with it.
//  2. **Size goes UP one step**, 10→11 (and dashboard headings 11→12). Lowercase at the same
//     pixel size reads smaller than caps because the x-height, not the cap-height, sets the
//     apparent size. Holding 10px would have made the labels genuinely hard to read rather than
//     merely quiet.
//
// Colour stays `subtle` — labels are never load-bearing information (console-ui skill "Tokens":
// ~2.9:1 by design), so the `addon-a11y` contrast finding on them remains the sanctioned one.

/** Structural label: form-control labels, rail section headings, table column headers. */
export const LABEL_CLASS = 'font-mono text-[11px] text-subtle';

/** The same role one step up — headings for the dashboard zones on the centre floor. */
export const DASHBOARD_LABEL_CLASS = 'font-mono text-[12px] text-subtle';
