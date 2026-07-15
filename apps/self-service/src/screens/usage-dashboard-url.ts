import type { UsageDashboardConfig } from '../configs/runtime-config-types';

/**
 * Builds the Grafana dashboard URL for the usage view.
 *
 * - `theme` matches the app's effective light/dark scheme so the embed blends in.
 * - `kiosk` strips Grafana's own chrome (top nav, menus) for the in-app iframe;
 *   the "open in Grafana" escape hatch passes `false` so the full interactive
 *   dashboard opens in a real browser tab instead.
 *
 * Per-user scoping is NOT encoded here: the `my-usage` dashboard filters to the
 * signed-in user via the shared Keycloak session on the Grafana side, so no user
 * id is ever placed in this URL (which would be a leak vector and unenforced).
 */
export function buildUsageDashboardUrl(
  usage: UsageDashboardConfig,
  theme: 'light' | 'dark',
  kiosk: boolean
): string {
  const params = new URLSearchParams({
    orgId: '1',
    theme,
    from: 'now-30d',
    to: 'now',
    timezone: 'browser',
    refresh: '30s',
  });
  const base = `${usage.grafanaUrl}${usage.dashboardPath}?${params.toString()}`;
  // `kiosk` is a bare flag (no value) in Grafana, so it's appended rather than
  // added to URLSearchParams (which would emit `kiosk=`).
  return kiosk ? `${base}&kiosk` : base;
}
