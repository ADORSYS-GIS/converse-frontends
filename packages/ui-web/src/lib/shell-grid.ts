// The shell's column geometry — the sibling of rail-grid.ts, one level up. rail-grid.ts owns what
// happens INSIDE a nav row (icon column, label gap); this file owns the shell's own zones: the
// sidebar column, the mobile top bar, and the centre between them.
//
// Revamp phase 2 (shell brief, 2026-08) — the three-rail header-band shell is dead. The new shape
// is two columns: a persistent 296px sidebar at `md`+ (nav, workspace switcher, and the settings
// that used to live in the header's right-hand cluster), and a single stretching content column.
// Below `md` the sidebar is replaced by a 48px top bar plus the existing bottom navigation dock.
//
// The sidebar was 240px until the owner's 2026-09-03 ruling ("240px is too small for the left
// rail. Increase it to 296px"). 240 was the width at which the longest real nav labels — the
// settings area's own rows, the admin group's, and an account name in the workspace switcher —
// had to truncate; 296 is 56px more, which is the whole gap plus room for the footer's trailing
// controls (the theme toggle, and the language SELECT that replaced its segmented strip on the
// same day) to sit beside their labels rather than under them.
//
// daisyUI has no upstream here — its `drawer` is a CSS-grid sidebar and is explicitly rejected in
// PRIMITIVES.md, since a grid sidebar cannot be sticky, independently scrollable and flush under
// nothing (there is no header band above it any more) at once. Every declaration below is
// therefore a hand-written utility by necessity.

/** The mobile/tablet top bar's height in px — both it and the content column's banner offset
 * size themselves against it. Written as a literal class string below, never interpolated —
 * Tailwind's content scanner only generates classes it can see as literal substrings in source. */
export const TOP_BAR_HEIGHT = 48;

/**
 * The persistent left sidebar (`ConsoleSidebar`) — 296px, `chrome` fill, a hairline on its
 * trailing edge, full viewport height, sticky, its own scroll. Hidden below `md`, where the top
 * bar and the bottom navigation dock take over.
 *
 * The width is written as a LITERAL in the class string below and stated as `SIDEBAR_WIDTH`
 * beside it for the callers that need the number rather than the class (documentation, the
 * content-measure arithmetic in `CONTENT_MAX_WIDTH_CLASS`'s own note). The two are deliberately
 * not interpolated into each other: Tailwind's content scanner only generates a class it can see
 * as a literal substring in source, so `md:w-[${SIDEBAR_WIDTH}px]` would compile to nothing.
 */
// `[--focus-gap:var(--color-chrome)]` matches `focus-ring`'s 1px gap to the zone's own `chrome`
// fill — the same reason the old header band set it, now stated on both zones that carry
// focusable slots (workspace switcher, palette trigger, theme toggle, identity).
export const SIDEBAR_WIDTH = 296;

export const SIDEBAR_CLASS =
  'hidden flex-col border-r border-raised bg-chrome [--focus-gap:var(--color-chrome)] md:flex md:w-[296px] md:flex-none md:sticky md:top-0 md:h-dvh md:overflow-y-auto';

/**
 * The mobile/tablet top bar (`ConsoleTopBar`) — 48px, `chrome` fill, sticky to the viewport top,
 * hidden at `md`+ where the sidebar is visible instead.
 */
export const TOP_BAR_CLASS =
  'flex h-12 items-center gap-3 border-b border-raised bg-chrome px-4 [--focus-gap:var(--color-chrome)] md:hidden sticky top-0 z-40';

/**
 * The centre column — the ONLY stretching zone, and the only one that pads itself, because it is
 * the only one sitting directly on the floor. `min-w-0` is mandatory: without it a wide child (a
 * ledger, a chart) blows the flex row open and the page scrolls sideways.
 *
 * The bottom clearance (`pb-20`) only has to clear the fixed bottom nav below `md` — reset at
 * `md`+, where the dock is hidden and the sidebar carries navigation instead.
 */
export const SHELL_CENTRE_CLASS = 'min-w-0 flex-1 px-4 py-6 pb-20 md:px-8 md:py-7';

/**
 * The right INSPECTOR rail (`ConsoleShell`'s optional `rail` slot) — `chrome` fill, a hairline on
 * its LEADING edge, full viewport height, sticky, its own scroll. The owner brought the rail back
 * (2026-08-30: "I liked it when the right rail was there... We could display settings there") on
 * the explicit condition that it is never empty by construction — it always resolves to either a
 * selection's detail or the scope quick-settings panel (`containers/inspector-rail.tsx`), so there
 * is no "nothing selected, blank column" state the way the deleted rail had. Visible at `lg`+ only
 * (1024px) — below that, the content it shows lives in a `BottomSheet` instead.
 *
 * Mirrors `SIDEBAR_CLASS` deliberately (`chrome` fill, a `raised` hairline on the edge that faces
 * the content column, `--focus-gap` set to the same fill) — the same chrome treatment, flipped to
 * the trailing edge. Unlike the sidebar, its WIDTH is not a fixed Tailwind class: the owner's
 * layout contract ("right rail... resizable by drag") makes it a per-viewer preference
 * (`ConsoleShell`'s `railWidth` prop, an inline style) the same way `RailResizer` reports it —
 * bounded by `INSPECTOR_RAIL_MIN_WIDTH`/`INSPECTOR_RAIL_MAX_WIDTH` below.
 */
export const INSPECTOR_RAIL_CLASS =
  'hidden flex-col border-l border-raised bg-chrome [--focus-gap:var(--color-chrome)] lg:flex lg:flex-none lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto';

/** The inspector rail's drag-resize bounds and default, in px — one definition `RailResizer`
 *  (clamping) and every `railWidth` owner (`use-rail-width.ts`, initial/fallback value) share. */
export const INSPECTOR_RAIL_MIN_WIDTH = 240;
export const INSPECTOR_RAIL_MAX_WIDTH = 480;
export const INSPECTOR_RAIL_DEFAULT_WIDTH = 280;

/** The content column's own reading measure — the shell has no page-level max-width of its own
 * (the sidebar already bounds the layout on the left), but unbounded prose/table width on an
 * ultra-wide viewport reads worse than a capped one.
 *
 * WHERE THE CAP ACTUALLY ENGAGES, stated honestly rather than implied. The centre column is
 * `viewport − SIDEBAR_WIDTH − 2 × 32px` (`SHELL_CENTRE_CLASS`'s own `md:px-8`), so the 1120px cap
 * only binds from `296 + 64 + 1120 = 1480px` up. At the 1440px reference viewport the measure is
 * therefore 1080px and this class does nothing at all — it is `mx-auto` on a column already
 * narrower than its own maximum.
 *
 * It DID bind at 1440 while the sidebar was 240px (engaging from 1424px), by sixteen pixels. The
 * owner's 2026-09-03 widening spent those on the rail, and the cap was deliberately NOT lowered
 * to 1080 to preserve the old behaviour: that would narrow every viewport above 1480 to hold one
 * reference width constant, which is trading a real reading measure for a number in a doc. What
 * changed at 1440 is 40px of content width, not the rule. */
export const CONTENT_MAX_WIDTH_CLASS = 'mx-auto w-full max-w-[1120px]';

/**
 * `MutationFailureBanner`'s own offset — sticky under the top bar below `md` (where the bar is
 * itself sticky and in normal flow above it), sticky to the viewport top at `md`+ (where there is
 * no chrome above the content column at all).
 */
export const BANNER_STICKY_CLASS = 'sticky top-12 md:top-0 z-30';
