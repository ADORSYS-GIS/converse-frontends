import type { DashboardPanelSize } from '../dashboard-panel';

/**
 * The two densities a panel body draws at (converse-frontends#446, decision D-E). Numbers, not
 * classes: a chart is handed real pixels (`console-ui` skill — charts measure their container and
 * take a `width`/`height`), and a table page size is a data decision, not a layout one.
 *
 * A panel in the two-column grid is roughly half the width the old single-column `/admin/overview`
 * gave the same chart, so the panel figures are deliberately short — the expanded dialog is where
 * a chart gets room, which is the whole reason the zoom affordance exists.
 */
export const PANEL_CHART_HEIGHT: Record<DashboardPanelSize, number> = {
  panel: 200,
  expanded: 460,
};

/** Only used before the chart's own container has been measured — every board is fluid-width. */
export const PANEL_CHART_FALLBACK_WIDTH: Record<DashboardPanelSize, number> = {
  panel: 520,
  expanded: 1180,
};

/** How many ranked rows a breakdown shows before folding the tail into `Other (N)`. */
export const PANEL_TOP_N: Record<DashboardPanelSize, number> = {
  panel: 6,
  expanded: 12,
};

/**
 * Ledger rows per page, and the ENGINE DEFAULT for every `table` panel — the owner's 2026-09-03
 * directive ("all table panels in /admin/overview need pagination") made paging a property of the
 * panel TYPE rather than something a page opts into, so there is no un-paginated table left to
 * hold a different number.
 *
 * 25 in the dialog, not 50: at 50 the expanded ledger's own last rows sit below the fold of an
 * 80vh dialog, so the pager is off screen exactly when a reader needs it, and "expanded" stops
 * meaning "more of this at once" and starts meaning "scroll further". A YAML author who wants a
 * different density says so per panel (`options.pageSize`), and the panel size still doubles it.
 */
export const PANEL_TABLE_PAGE_SIZE: Record<DashboardPanelSize, number> = {
  panel: 10,
  expanded: 25,
};

/** How a panel's own `options.pageSize` (the PANEL-size figure) scales in the expanded dialog —
 *  the same ratio the defaults above hold, so one YAML number still yields two honest densities. */
export const PANEL_TABLE_PAGE_SIZE_RATIO: Record<DashboardPanelSize, number> = {
  panel: 1,
  expanded: PANEL_TABLE_PAGE_SIZE.expanded / PANEL_TABLE_PAGE_SIZE.panel,
};
