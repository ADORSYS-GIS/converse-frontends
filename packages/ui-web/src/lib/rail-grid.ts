import { LABEL_CLASS } from './type-roles';

// The rail alignment grid — ONE explicit set of x-offsets and row heights shared by every
// rail-column component: `NavSpine`, `SubNav`, `RailPanel`'s uppercase section label, and any
// other rail section that ever grows a row list (scope, filters, view, export, hygiene, report,
// selection…). Import these instead of hand-rolling per-component padding/margin/width magic
// numbers — three independently-drifted magic numbers (nav-spine's icon x, `RailPanel`'s
// `MANAGE` label x, and `SubNav`'s row x, plus two different active-bar insets) is exactly the
// owner-reported bug this file fixes (screenshot review, fix/ui-web-rail-alignment-grid).
//
// Geometry, in px, all built from the console-ui skill's 4·8·12·16·20·24·32·40 spacing scale:
//
//   rail's TRUE   |8px  |20px                    |44px
//   left edge     |bar  |icon col start           |label start
//   0 ────────────┼─────┼─────────────────────────┼──────────────────────────────
//                 │     │                         │
//                 │     ├─ RAIL_ROW_PADDING_X(12) ┤
//                 │     │                         ├─ RAIL_ICON_COLUMN_WIDTH(16) ─┤
//                 │     │                                                        ├─ RAIL_LABEL_GAP(8) ─┤
//                 └─ RAIL_ROW_BLEED(8), i.e. the row list bleeding out of the
//                    section's own RAIL_SECTION_INSET(16) via `-mx-2`
//
// Rules encoded here:
//
// 1. Every row list (`NavSpine`'s `<nav>`, `SubNav`'s `<ul>`) bleeds 8px out of its enclosing
//    `RailPanel`'s 16px padding via `-mx-2` (`RAIL_ROW_BLEED_CLASS`) — net 8px inset from the
//    rail's TRUE left edge. This is the ONE inset used for both the 2px active bar and the
//    active-row background fill, identical for nav rows and sub-nav rows. Before this fix,
//    `SubNav` had no bleed at all, so its active bar sat flush with the *unbled* 16px section
//    inset while `NavSpine`'s sat at the bled 8px — a visible 8px jump between the two bars.
// 2. Every row's own horizontal padding is `px-3` (`RAIL_ROW_PADDING_CLASS`, 12px), identical
//    for nav rows and sub-nav rows. Before this fix `SubNav` relied on daisyUI's `menu` default
//    gutters instead of an explicit value, which is what let it drift.
// 3. Icons sit in a fixed 16px column (`RAIL_ICON_COLUMN_CLASS`, `w-4 shrink-0`) regardless of
//    the glyph's own rendered size, followed by an 8px gap (`RAIL_LABEL_GAP_CLASS`, `gap-2`) —
//    so mixed icon widths never move where labels start.
// 4. ONE rule for every label in the rail, icon or no icon: labels start at the icon-column's
//    trailing edge (`RAIL_LABEL_X`, 44px from the rail's true left edge), never at the icon's
//    own leading edge. A row with no icon (`SubNav` rows, `RailPanel`'s uppercase section label)
//    reserves an empty `RAIL_ICON_COLUMN_CLASS` spacer rather than starting flush where an icon
//    would sit — so nav labels, sub-nav labels, and section labels always read as one aligned
//    column of text, and sub-nav visibly nests under the nav spine's LABEL column (not its icon
//    column), which is the more legible of the two options the fix had to choose between.
// 5. The active bar is `w-[2px] bg-primary`, `absolute inset-y-0 left-0` inside the (bled) row —
//    width and inset are identical for `NavSpine` and `SubNav` (`RAIL_ACTIVE_BAR_CLASS`).
// 6. Row heights: nav rows are DELIBERATELY taller than sub-nav rows — nav is the primary route
//    spine (bigger hit target, top-level wayfinding); sub-nav is a denser secondary list — but
//    the difference is a fixed, stated 6px, not incidental drift: `RAIL_NAV_ROW_HEIGHT` (34px)
//    vs `RAIL_SUBNAV_ROW_HEIGHT` (28px).

export const RAIL_SECTION_INSET = 16;
export const RAIL_ROW_BLEED = 8;
export const RAIL_ROW_PADDING_X = 12;
export const RAIL_ICON_COLUMN_WIDTH = 16;
export const RAIL_LABEL_GAP = 8;
export const RAIL_ACTIVE_BAR_WIDTH = 2;

/** Net inset of the active-row fill/active-bar from the rail's TRUE left edge. */
export const RAIL_ACTIVE_BAR_INSET = RAIL_ROW_BLEED; // 8

/** Shared x every rail label (nav, sub-nav, section heading) starts at, from the rail's TRUE left edge. */
export const RAIL_LABEL_X =
  RAIL_ROW_BLEED + RAIL_ROW_PADDING_X + RAIL_ICON_COLUMN_WIDTH + RAIL_LABEL_GAP; // 44

/** `RailPanel`'s uppercase section label needs this much padding ON TOP of the panel's own
 * `p-4` (16px) to land its text at `RAIL_LABEL_X` — it has no row bleed/padding/icon column of
 * its own to build that offset from, since it isn't a row. */
export const RAIL_SECTION_LABEL_INDENT = RAIL_LABEL_X - RAIL_SECTION_INSET; // 28

export const RAIL_NAV_ROW_HEIGHT = 34;
export const RAIL_SUBNAV_ROW_HEIGHT = 28;

// Literal Tailwind classes for the grid above. Tailwind's JIT content scanner needs literal
// class-name substrings somewhere in scanned source — this file IS scanned source (same
// technique `cva.ts` files already use), so centralizing the strings here keeps them visible to
// the compiler while giving every consumer one byte-identical import instead of a re-typed copy.
export const RAIL_ROW_BLEED_CLASS = '-mx-2';
export const RAIL_ROW_PADDING_CLASS = 'px-3';
export const RAIL_ICON_COLUMN_CLASS = 'flex w-4 shrink-0 items-center justify-center';
export const RAIL_LABEL_GAP_CLASS = 'gap-2';
export const RAIL_ACTIVE_BAR_CLASS = 'absolute inset-y-0 left-0 w-[2px] bg-primary';
export const RAIL_NAV_ROW_HEIGHT_CLASS = 'h-[34px]';
export const RAIL_SUBNAV_ROW_HEIGHT_CLASS = 'h-7';
/** `pl-[28px]` = `RAIL_SECTION_LABEL_INDENT` — see the comment above. The type treatment itself
 * is the shared `label` role (`type-roles.ts`); only the grid offset is this file's business. */
export const RAIL_SECTION_LABEL_CLASS = `mb-3 pl-[28px] ${LABEL_CLASS}`;
