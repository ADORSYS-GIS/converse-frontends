// The rail alignment grid — ONE explicit set of x-offsets and row heights shared by every
// rail-row component: `NavSpine` and `SubNav`. Import these instead of hand-rolling per-component
// padding/margin/width magic numbers — three independently-drifted magic numbers (nav-spine's
// icon x, the old `RailPanel`'s `MANAGE` label x, and `SubNav`'s row x, plus two different
// active-bar insets) is exactly the owner-reported bug this file originally fixed (screenshot
// review, fix/ui-web-rail-alignment-grid).
//
// Revamp phase 2 (shell brief, 2026-08) — `RailPanel` is deleted (the left rail is now
// `ConsoleSidebar`, a flat container with no per-section 16px inset to bleed rows out of), so the
// bleed-out-of-a-panel geometry (`RAIL_SECTION_INSET`/`RAIL_LABEL_X`/`RAIL_SECTION_LABEL_INDENT`/
// `RAIL_SECTION_PADDING_CLASS`/`RAIL_SECTION_LABEL_CLASS`) is gone with it. What survives is the
// ROW geometry itself — `NavSpine`'s `sidebar` layout and `SubNav` (still rendered inside the
// legacy `@rail` sections this phase keeps, `Card`-wrapped, until phase 3) still render the exact
// same row shape and must keep agreeing on it.
//
// Two numbers changed for the new sidebar (owner brief, 2026-08-30): nav rows are now 36px
// (`RAIL_NAV_ROW_HEIGHT`, exclusively `NavSpine`'s own constant — `SubNav` was never built from
// it) and the icon→label gap is now 10px (`RAIL_LABEL_GAP`, shared by both row kinds — the two
// were always the same gap by contract, and stay that way). The row bleed, row padding and icon
// column are UNCHANGED (8/12/16), which is also exactly the sidebar brief's own "inset 8, icon
// col 16" — nothing about them needed to move.
//
// Geometry, in px:
//
//   row's own    |8px  |20px                    |46px
//   left edge    |bar  |icon col start           |label start
//   0 ───────────┼─────┼─────────────────────────┼──────────────────────────────
//                │     │                         │
//                │     ├─ RAIL_ROW_PADDING_X(12) ┤
//                │     │                         ├─ RAIL_ICON_COLUMN_WIDTH(16) ─┤
//                │     │                                                        ├─ RAIL_LABEL_GAP(10) ─┤
//                └─ RAIL_ROW_BLEED(8) / RAIL_ACTIVE_BAR_INSET — where the active
//                   bar and fill sit
//
// Rules encoded here:
//
// 1. Every row's own horizontal padding is `px-3` (`RAIL_ROW_PADDING_CLASS`, 12px), identical
//    for nav rows and sub-nav rows.
// 2. Icons sit in a fixed 16px column (`RAIL_ICON_COLUMN_CLASS`, `w-4 shrink-0`) regardless of
//    the glyph's own rendered size, followed by a 10px gap (`RAIL_LABEL_GAP_CLASS`, `gap-2.5`) —
//    so mixed icon widths never move where labels start.
// 3. A row with no icon (`SubNav` rows) still reserves an empty `RAIL_ICON_COLUMN_CLASS` spacer
//    rather than starting flush where an icon would sit — so nav labels and sub-nav labels read
//    as one aligned column of text.
// 4. The active bar is `w-[2px] bg-primary`, `absolute inset-y-0 left-0` inside the row — width
//    and inset are identical for `NavSpine` and `SubNav` (`RAIL_ACTIVE_BAR_CLASS`).
// 5. Row heights: nav rows are DELIBERATELY taller than sub-nav rows — nav is the primary route
//    spine (bigger hit target, top-level wayfinding); sub-nav is a denser secondary list — but
//    the difference is a fixed, stated 8px, not incidental drift: `RAIL_NAV_ROW_HEIGHT` (36px)
//    vs `RAIL_SUBNAV_ROW_HEIGHT` (28px).

export const RAIL_ROW_BLEED = 8;
export const RAIL_ROW_PADDING_X = 12;
export const RAIL_ICON_COLUMN_WIDTH = 16;
export const RAIL_LABEL_GAP = 10;
export const RAIL_ACTIVE_BAR_WIDTH = 2;

/** Net inset of the active-row fill/active-bar from the row's own left edge — also the sidebar
 * brief's own "inset 8". */
export const RAIL_ACTIVE_BAR_INSET = RAIL_ROW_BLEED; // 8

export const RAIL_NAV_ROW_HEIGHT = 36;
export const RAIL_SUBNAV_ROW_HEIGHT = 28;

// Literal Tailwind classes for the grid above. Tailwind's JIT content scanner needs literal
// class-name substrings somewhere in scanned source — this file IS scanned source (same
// technique `cva.ts` files already use), so centralizing the strings here keeps them visible to
// the compiler while giving every consumer one byte-identical import instead of a re-typed copy.
export const RAIL_ROW_BLEED_CLASS = '-mx-2';
export const RAIL_ROW_PADDING_CLASS = 'px-3';
export const RAIL_ICON_COLUMN_CLASS = 'flex w-4 shrink-0 items-center justify-center';
export const RAIL_LABEL_GAP_CLASS = 'gap-2.5';
export const RAIL_ACTIVE_BAR_CLASS = 'absolute inset-y-0 left-0 w-[2px] bg-primary';
export const RAIL_NAV_ROW_HEIGHT_CLASS = 'h-9';
export const RAIL_SUBNAV_ROW_HEIGHT_CLASS = 'h-7';
