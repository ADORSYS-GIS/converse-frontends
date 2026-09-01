// The console's inline status/error line geometry — a wrapping row of mono text with an optional
// inline action beside it (`InlineStatus`, `ErrorLine`, `BudgetHero`'s action/caption footer).
//
// Declared once because it is a contract, not a coincidence: the console-ui skill's "States"
// section says an empty state IS a line above still-rendered structure and an error IS a signal
// line with an inline Retry — so all three render the same box and only the type role differs.
// daisyUI's nearest match is `alert`, explicitly rejected in PRIMITIVES.md § "What is explicitly
// not adopted" (bordered, iconed, rounded), so there is no upstream class to inherit here.
//
// The asymmetric gap is deliberate: 12px between the text and its action reads as one line;
// 4px between wrapped lines keeps a long message from opening into a paragraph.
export const INLINE_ROW_CLASS = 'flex flex-wrap items-center gap-x-3 gap-y-1';
