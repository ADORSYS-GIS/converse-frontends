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

/** Ledger rows per page — the AC's "table page size 50" when expanded. */
export const PANEL_TABLE_PAGE_SIZE: Record<DashboardPanelSize, number> = {
  panel: 10,
  expanded: 50,
};
