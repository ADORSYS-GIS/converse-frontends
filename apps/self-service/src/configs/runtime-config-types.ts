import type { AudienceConfig } from '@lightbridge/hooks';

export type KeycloakConfig = {
  issuer: string;
  clientId: string;
  scheme: string;
  /** JWT audience validation configuration */
  audience?: AudienceConfig;
};

/**
 * Grafana usage-dashboard embedding. Optional: when absent the Usage tab is
 * hidden entirely, so the feature ships dark until an operator provides a
 * Grafana base URL. `grafanaUrl` must be served **same-site** as this app and
 * have `allow_embedding = true` for the iframe to render (see the Usage view).
 */
export type UsageDashboardConfig = {
  /** Grafana origin, e.g. https://grafana.ai.camer.digital (no trailing slash). */
  grafanaUrl: string;
  /** Dashboard path incl. uid + slug, e.g. /d/my-usage/ai-gateway-e28094-my-usage */
  dashboardPath: string;
};

export type AppRuntimeConfig = {
  backendUrl: string;
  keycloak: KeycloakConfig;
  usage?: UsageDashboardConfig;
};

export function isAppRuntimeConfig(value: unknown): value is AppRuntimeConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as AppRuntimeConfig;

  return (
    typeof config.backendUrl === 'string' &&
    typeof config.keycloak?.issuer === 'string' &&
    typeof config.keycloak?.clientId === 'string' &&
    typeof config.keycloak?.scheme === 'string'
  );
}
