// Shared chrome for every floating overlay: Base UI popups and drawers, cmdk's palette.
//
// EDGE CASE against the skill's "no borders on panels": overlays get a `border-border` hairline,
// docked panels do not. A panel separates tonally from a neighbour whose colour is known at
// design time; an overlay floats over arbitrary content — the account menu spans the header AND
// the floor at once — so tonal separation alone left its edge indistinct (owner screenshot,
// 2026-08-29).

export const OVERLAY_CLASS = 'rounded-[2px] border border-border bg-surface outline-hidden';

/**
 * Base UI's positioner — the element Floating UI moves, not the one that gets painted. It sits
 * above every panel, never draws a focus outline of its own (the popup inside it owns focus), and
 * is not text-selectable. Identical at every call site, which is why it lives here rather than
 * being re-typed beside each `Select.Positioner`/`Popover.Positioner`.
 */
export const OVERLAY_POSITIONER_CLASS = 'z-50 outline-hidden select-none';

/**
 * A popup anchored to a field control (a `Select`/`Combobox` list under its trigger): overlay
 * chrome, at least as wide as the trigger it hangs off — `min-w-`, not `w-`, so a label longer
 * than a narrow rail select still reads in full rather than truncating to the trigger's width.
 */
export const OVERLAY_ANCHORED_POPUP_CLASS = `min-w-(--anchor-width) py-1 ${OVERLAY_CLASS}`;

/** Highlighted row inside an overlay list (Menu.Item, Select.Item, cmdk item). */

/**
 * The scrim behind a modal overlay. One definition for all four dialogs, the command palette and
 * the bottom sheet — they were six copies of the same three utilities.
 *
 * `z-50` matches the popup that sits on it: both render into the same portal, in document order
 * backdrop-then-popup, so the popup wins the tie without a second z index step.
 */
export const OVERLAY_BACKDROP_CLASS = 'fixed inset-0 z-50 bg-muted/80';

/**
 * Highlighted row inside an overlay list.
 *
 * Covers all three primitives that render one: Base UI marks the active row `data-highlighted`
 * (Menu.Item, Select.Item), cmdk marks it `data-selected` — same visual state, two vocabularies,
 * so the class answers to both instead of each consumer re-deriving it.
 *
 * `shadow-none` is load-bearing under daisy's `menu`: daisy paints a 1%-alpha inset box shadow on
 * item hover, and ADR 0008 bans box shadows outright. Tailwind utilities are unlayered inside
 * `utilities` while daisy emits into a sublayer of it, so this wins with no `!important`.
 */
export const OVERLAY_ITEM_CLASS =
  'flex cursor-pointer items-center gap-3 px-3 py-1.5 text-xs text-soft shadow-none outline-hidden data-[highlighted]:bg-raised data-[highlighted]:text-ink data-[selected=true]:bg-raised data-[selected=true]:text-ink data-[disabled]:cursor-not-allowed data-[disabled]:text-subtle data-[disabled]:opacity-60 data-[disabled]:hover:bg-transparent';

/** Hairline rule between groups inside an overlay. */
export const OVERLAY_SEPARATOR_CLASS = 'mx-1 my-1 h-px bg-raised';

/**
 * The row that is the CURRENT choice — the account you are already in, the theme already applied.
 *
 * Distinct from `data-highlighted`, which `OVERLAY_ITEM_CLASS` already covers: highlight is where
 * the pointer or the arrow keys are right now, selection is what is true. Both account overlays
 * mark it the same way and had spelled it out separately; per the console-ui skill's "States"
 * rule, selection is a step UP in text strength, never a pill, a tick or a coloured dot.
 */
export const OVERLAY_CURRENT_CLASS = 'text-ink';

/**
 * A row that carries a trailing marker beside its label — the label takes the space, the marker
 * sits at the end. `AccountBadge`'s account list is the case: name on the left, `active` on the
 * right.
 */
export const OVERLAY_SPLIT_ROW_CLASS = 'justify-between';

/** That trailing marker itself: plain text one step back, never a badge. */
export const OVERLAY_MARKER_CLASS = 'text-subtle';

/**
 * A non-interactive block inside an overlay — an identity line, a labelled group of choices.
 * Pads to the same inset the item rows use, so a block and a row line up on the same left edge.
 *
 * `hover:bg-transparent` and `cursor-default` are the daisy suppression: inside a `menu`, daisy
 * fills and pointer-cursors EVERY child of an `li` on hover, which turns a block you cannot press
 * into one that looks pressable.
 */
export const OVERLAY_SECTION_CLASS =
  'flex cursor-default flex-col gap-1 px-3 py-2 hover:bg-transparent';
