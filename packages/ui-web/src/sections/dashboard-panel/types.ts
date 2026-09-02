import type { ReactNode } from 'react';

/**
 * How much room the body has to draw in.
 *
 * `'panel'` — inside the grid: the chart height a two-column board affords, fewer axis ticks, a
 * short table page.
 * `'expanded'` — the zoom dialog: a much taller chart, more ticks, a 50-row table page.
 *
 * Passed to the body render-prop rather than inferred from a media query, because the two
 * renderings differ in DATA density (how many rows are fetched into the page, how many ticks are
 * meaningful) and not only in pixels.
 */
export type DashboardPanelSize = 'panel' | 'expanded';

export interface DashboardPanelBodyContext {
  size: DashboardPanelSize;
}

export interface DashboardPanelProps {
  /** Stable identity — the panel id from `dashboards.yaml`. Used for the heading's element ids so
   *  the expanded dialog can point `aria-labelledby` at a real title. */
  id: string;
  title: string;
  /** One quiet line under the title stating what the panel is measuring, its window, or an honest
   *  limitation. Never a second heading. */
  subtitle?: string;
  /** Extra controls for the heading's action cluster — typically a scale `SegmentedControl` for a
   *  series panel. The Expand button is ALWAYS appended after these by the panel itself; a caller
   *  cannot opt out of the zoom affordance. */
  actions?: ReactNode;
  /** Renders the panel's content at the requested size. Called twice when the expanded view is
   *  open (once in the grid behind the scrim, once in the dialog) — so it must be a pure function
   *  of its context, not a memoised singleton node. */
  children: (ctx: DashboardPanelBodyContext) => ReactNode;
  /** `2` spans both columns of `DashboardGrid` at `lg` and up. Defaults to `1`. */
  span?: 1 | 2;
  /**
   * Whether this panel draws the `Card` + `ZoneHeading` chrome around its body.
   *
   * `'card'` (default) — the zone container every chart, list and table panel uses (ADR 0012 D3:
   * `Card` is the zone treatment console-wide).
   *
   * `'bare'` — body only, on the floor. For the two SELF-PANELLING bodies the console-ui skill
   * already exempts by name: `StatCard` (and `OverviewStatRow`, which is a row of them) carries
   * "its own `surface` fill, never wrapped in an outer `Card`, matching every other stat row in
   * the console." Wrapping one anyway produces a card inside a card AND states its label twice —
   * once in the panel heading, once on the stat itself. A bare panel therefore has no heading row
   * and no Expand button: the stat's own label IS the title, and a single numeral has nothing to
   * reveal at 1280 x 80vh that it is not already showing. Everything else — the grid span, the
   * focusable root — is unchanged.
   */
  chrome?: 'card' | 'bare';
  /** Controlled expansion — omit to let the panel own it. Supplied by the console when the
   *  expanded panel is reflected in the URL. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** The key that expands the panel while focus is inside it. Defaults to `v` (decision D-E). */
  hotkey?: string;
  className?: string;
}
