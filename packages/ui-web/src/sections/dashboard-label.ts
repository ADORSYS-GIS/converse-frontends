/**
 * The `label` type role at dashboard-heading size — 11px mono, uppercase, tracked .09em, `subtle`
 * (console-ui skill "Type"). Shared by the three overview dashboard sections so the heading
 * treatment is defined once, not copied per zone.
 */
export const DASHBOARD_LABEL = 'font-mono text-[11px] uppercase tracking-[.09em] text-subtle';

/** The same role one step down (10px) — used for sub-blocks inside a dashboard zone. */
export const SECTION_LABEL = 'font-mono text-[10px] uppercase tracking-[.09em] text-subtle';

/**
 * Shared inline-status wording for the `'unwired'` chart status (`DashboardStatus`,
 * `SpendShareStatus`) and its rail echo (`OverviewSeriesRail`'s `emptyMessage`) — "this section's
 * data source has never been queried," as opposed to a query that ran and returned zero rows,
 * which each chart primitive's own default `emptyMessage` already covers on its own terms
 * ("No usage/spend in this range."). Defined once here so `SpendDashboard`, `LatencyDashboard`,
 * `SpendShareSection` and `OverviewSeriesRail` cannot drift on the wording (console-ui skill
 * "empty states are inline status lines" — never a fabricated `0`, never rendered blank).
 */
export const UNWIRED_CHART_MESSAGE = 'Not wired — see banner above.';
