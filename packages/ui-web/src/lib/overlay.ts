// Shared chrome for every floating overlay: Base UI popups, cmdk's palette, vaul's sheet.
//
// EDGE CASE against the skill's "no borders on panels": overlays get a `border-border` hairline,
// docked panels do not. A panel separates tonally from a neighbour whose colour is known at
// design time; an overlay floats over arbitrary content — the account menu spans the header AND
// the floor at once — so tonal separation alone left its edge indistinct (owner screenshot,
// 2026-08-29).

export const OVERLAY_CLASS = 'rounded-[2px] border border-border bg-surface outline-hidden';

/** Highlighted row inside an overlay list (Menu.Item, Select.Item, cmdk item). */
export const OVERLAY_ITEM_CLASS =
  'flex cursor-pointer items-center gap-3 px-3 py-1.5 text-xs text-soft outline-hidden data-[highlighted]:bg-raised data-[highlighted]:text-ink';

/** Hairline rule between groups inside an overlay. */
export const OVERLAY_SEPARATOR_CLASS = 'mx-1 my-1 h-px bg-raised';
