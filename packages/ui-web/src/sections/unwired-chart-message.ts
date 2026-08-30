/**
 * Shared inline-status wording for the `'unwired'` chart status (`DashboardStatus`,
 * `SpendShareStatus`) — "this section's data source has never been queried," as opposed to a
 * query that ran and returned zero rows, which each chart primitive's own default `emptyMessage`
 * already covers on its own terms ("No usage/spend in this range."). Defined once so
 * `SpendDashboard` and `SpendShareSection` cannot drift on the wording (console-ui skill "empty
 * states are inline status lines" — never a fabricated `0`, never rendered blank).
 *
 * Lived in `sections/dashboard-label.ts` until 2026-08-29, when that file's two type-role
 * constants moved to `lib/type-roles.ts` (one definition of the `label` role for the whole
 * package). This is copy, not type, so it did not follow them there — it gets its own module
 * rather than being filed under a name that no longer describes it.
 */
export const UNWIRED_CHART_MESSAGE = 'Not wired — see banner above.';
