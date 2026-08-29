// The shell's column geometry — the sibling of rail-grid.ts, one level up. rail-grid.ts owns what
// happens INSIDE a rail (row bleed, icon column, label x); this file owns the rail COLUMNS
// themselves and the centre between them.
//
// It exists for the same reason rail-grid.ts does: these strings encode a contract that is
// invisible in any one of them on its own, so they must not be re-typed. daisyUI has no upstream
// here — its `drawer` is a CSS-grid sidebar and is explicitly rejected in PRIMITIVES.md, since a
// grid sidebar cannot be sticky, independently scrollable and flush under the header at once.
// Every declaration below is therefore a hand-written utility by necessity; each is annotated
// with the clause of the console-ui skill that requires it.

/**
 * Header height in px. Both rails stick to it and both size themselves against it, so it is one
 * number here rather than three literals across two files. Matches ConsoleHeader's own h-14.
 */
export const SHELL_HEADER_HEIGHT = 56;

/**
 * Sticky, independently-scrollable rail column ("Shape and layout": sticky top-56, max-h
 * viewport-minus-header, own overflow-y).
 *
 * Written as literal class strings, never interpolated from SHELL_HEADER_HEIGHT — Tailwind's
 * content scanner only generates classes it can see as literal substrings in source.
 *
 * min-h alongside max-h is what makes the flush full-height rail contract hold on SHORT pages:
 * a sticky column sizes to its own content (its parent flex row is items-start and never
 * stretches children), so without it a rail with few sections stopped short of the floor.
 * Pinning min-h to the same calc forces "viewport minus header" always; taller content still
 * scrolls internally rather than growing the column.
 */
export const RAIL_STICKY_CLASS =
  'md:sticky md:top-[56px] md:min-h-[calc(100dvh-56px)] md:max-h-[calc(100dvh-56px)] md:overflow-y-auto';

/**
 * The shared paint of a rail column: one continuous surface panel whose sections separate with a
 * single raised hairline (divide-y), never a gap that lets the floor show through ("Rails are
 * flush, aligned, full-height columns"). This is why RailPanel carries no background of its own.
 */
const RAIL_COLUMN_BASE_CLASS = 'divide-raised bg-surface hidden divide-y';

/** Left rail: 208px, appears at md (the tier where a persistent rail returns). */
export const LEFT_RAIL_CLASS = `${RAIL_COLUMN_BASE_CLASS} flex-none flex-col md:flex md:w-[208px]`;

/**
 * Right rail: 280px, and only at lg. Below lg it is not an overlay and not a footer bar — it is
 * absent, and each page re-offers its sections through contextual SectionSheet triggers (owner
 * revision 2026-08-25).
 */
export const RIGHT_RAIL_CLASS = `${RAIL_COLUMN_BASE_CLASS} lg:flex lg:w-[280px] lg:flex-none lg:flex-col`;

/**
 * The centre column — the ONLY stretching zone, and the only one that pads itself, because it is
 * the only one sitting directly on the floor. min-w-0 is mandatory: without it a wide child
 * (a ledger, a chart) blows the flex row open and the page scrolls sideways.
 *
 * The bottom clearance only has to clear the fixed bottom nav below md (56px); the right rail
 * contributes no fixed chrome at any tier.
 */
export const SHELL_CENTRE_CLASS = 'min-w-0 flex-1 px-4 py-6 pb-20 md:px-6 md:pb-6';
