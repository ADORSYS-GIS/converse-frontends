import { cn } from '../cn';

// Shared chrome for every floating overlay: Base UI popups and drawers, cmdk's palette.
//
// EDGE CASE against the skill's "no borders on panels": overlays get a `border-border` hairline,
// docked panels do not. A panel separates tonally from a neighbour whose colour is known at
// design time; an overlay floats over arbitrary content — the account switcher spans the header
// AND the floor at once — so tonal separation alone left its edge indistinct (owner screenshot,
// 2026-08-29).

export const OVERLAY_CLASS = 'rounded-[2px] border border-border bg-surface outline-hidden';

/**
 * `OVERLAY_CLASS` at the floating-overlay radius (`--radius-overlay-floating`, theme.css: 10px —
 * owner ruling, 2026-08-31, issue #368: "10px looks good for the command palette"). Apply to
 * every anchored popup that points at a trigger from an arbitrary screen position: Menu popups
 * (the account switcher, and any other Base UI Menu), Select/Combobox popups, Popovers, and the
 * command palette panel (`CommandPalette` composes the token directly since cmdk owns its own
 * root class, not `OVERLAY_CLASS`). NEVER apply to a docked overlay — Dialog, the bottom sheet
 * Drawer, Tooltip — which stay at the flush 2px contract (`OVERLAY_CLASS` unwrapped).
 *
 * `rounded-(--radius-overlay-floating)` (the CSS-variable arbitrary-value syntax, not a named
 * `rounded-overlay-floating` utility) is deliberate: `cn()`'s `tailwind-merge` recognises the
 * bracket/paren arbitrary-value form as the same "rounded" conflict group `OVERLAY_CLASS`'s own
 * `rounded-[2px]` belongs to regardless of the value inside, and evicts it cleanly. A custom
 * named utility is not in `tailwind-merge`'s built-in class list, so the two classes would both
 * survive the merge and the cascade would decide by CSS source order instead of intent.
 */
export const OVERLAY_FLOATING_CLASS = cn(OVERLAY_CLASS, 'rounded-(--radius-overlay-floating)');

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

/** `OVERLAY_ANCHORED_POPUP_CLASS` at the floating-overlay radius — the Select/Combobox counterpart
 *  to `OVERLAY_FLOATING_CLASS`'s Menu/Popover coverage. See that constant's own doc comment for
 *  the full contract; `cn()` here evicts the embedded `rounded-[2px]` the same way. */
export const OVERLAY_ANCHORED_POPUP_FLOATING_CLASS = cn(
  OVERLAY_ANCHORED_POPUP_CLASS,
  'rounded-(--radius-overlay-floating)'
);

/** Highlighted row inside an overlay list (Menu.Item, Select.Item, cmdk item). */

/**
 * The scrim behind a modal overlay. One definition for all four dialogs, the command palette and
 * the bottom sheet — they were six copies of the same three utilities.
 *
 * `z-50` matches the popup that sits on it: both render into the same portal, in document order
 * backdrop-then-popup, so the popup wins the tie without a second z index step.
 *
 * Fades the scrim in/out on the two Base UI primitives that stamp open/close state (Dialog,
 * Drawer) — same fix as `sheet-panel`'s slide in `theme.css` (owner finding, 2026-08-31: the
 * bottom sheet "appear with NO ANIMATION" — the scrim popped instantly right along with the
 * panel, since neither had a transition keyed off those attributes). The enter half is Tailwind's
 * `starting:` variant (compiles to the real CSS `@starting-style` at-rule), not `data-[starting-
 * style]:` — confirmed against the live popup that the attribute selector never actually fires:
 * Base UI flips `data-starting-style` off via a React layout effect that runs BEFORE the
 * browser's first paint of the newly-mounted backdrop, so a plain attribute selector never gets a
 * chance to be visually distinct from the end state (`sheet-panel`'s own comment in `theme.css`
 * has the full mechanism). The exit half stays `data-[ending-style]:opacity-0` — closing starts
 * from an already-painted element, so that later reflow is a genuine, transitionable change.
 * cmdk's own backdrop (`CommandPalette`) never sets any of these, so both rules are a no-op there
 * and it keeps its existing instant show/hide.
 */
export const OVERLAY_BACKDROP_CLASS =
  'fixed inset-0 z-50 bg-muted/80 opacity-100 transition-opacity duration-200 ease-out starting:opacity-0 data-[ending-style]:opacity-0';

/**
 * Highlighted row inside an overlay list — Base UI Menu.Item/Select.Item, the only two
 * primitives that render through this class (cmdk styles its own `[cmdk-item]` rows directly in
 * `theme.css`'s command-palette block, never through this constant).
 *
 * Base UI marks BOTH states as bare-presence data attributes — `data-highlighted` (pointer/
 * keyboard focus) and `data-selected` (this row IS the control's current value) are added when
 * true and removed entirely when false, never stringified to `="true"`/`="false"` (confirmed
 * against the rendered DOM, unify-select audit, issue #368: a `Select.Item`'s selected row prints
 * `data-selected=""`, not `data-selected="true"`). This class used to spell the selected rule
 * `data-[selected=true]:...`, a selector that requires the LITERAL string value `"true"` — it
 * never matched a real Base UI item, so every Select/Menu/Combobox popup in the console rendered
 * its currently-chosen row with NO visual distinction from an unselected one unless that row also
 * happened to be keyboard-highlighted. `data-[selected]` (bare presence, matching `data-highlighted`'s
 * own idiom two lines up) is the fix.
 *
 * `shadow-none` is load-bearing under daisy's `menu`: daisy paints a 1%-alpha inset box shadow on
 * item hover, and ADR 0008 bans box shadows outright. Tailwind utilities are unlayered inside
 * `utilities` while daisy emits into a sublayer of it, so this wins with no `!important`.
 */
export const OVERLAY_ITEM_CLASS =
  'flex cursor-pointer items-center gap-3 px-3 py-1.5 text-xs text-soft shadow-none outline-hidden data-[highlighted]:bg-raised data-[highlighted]:text-ink data-[selected]:bg-raised data-[selected]:text-ink data-[disabled]:cursor-not-allowed data-[disabled]:text-subtle data-[disabled]:opacity-60 data-[disabled]:hover:bg-transparent';

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
