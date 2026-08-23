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
  /** RPC basePath the authz-rpc client prepends, e.g. /api/v2. Defaults to the
   *  cratestack-generated client's own default ('/api') when unset. */
  apiBasePath?: string;
  /**
   * Base URL for the `authz-budget` microservice, which the 14 `budget:*`-gated RPC procedures
   * moved onto (lightbridge-authz PR #351, hard cutover -- `authz-api` no longer serves them at
   * all, see `docs/architecture/budget.md` in that repo). Always resolved by `loadRuntimeConfig`
   * (falls back to `backendUrl` when unset), so this is never `undefined` at the point a client
   * reads it. The path prefix is NOT configurable here: `authz-budget` mounts its RPC surface
   * under a fixed `/budget` prefix, unlike `apiBasePath` above, so the budget client hardcodes
   * `basePath: '/budget'` in code instead of reading a config field for it.
   *
   * `authz-budget`'s ingress is not enabled in any shared environment yet (as of this field's
   * introduction). Until an operator sets `EXPO_PUBLIC_BUDGET_URL` / `config.json`'s
   * `budgetBaseUrl`, this falls back to `backendUrl`, which will 404 on every budget op-id --
   * expected until the service is reachable, not a bug in this fallback.
   */
  budgetBaseUrl: string;
  keycloak: KeycloakConfig;
  usage?: UsageDashboardConfig;
  /**
   * ADR 0008 Decision 8: "a logo URL belongs in admin config and is rendered in the header."
   * Optional, same "ships dark until configured" posture as `usage` above — when unset,
   * `ConsoleHeader` (`navigation/console-header.tsx`) renders nothing rather than a placeholder.
   */
  logoUrl?: string;
};

export function isAppRuntimeConfig(value: unknown): value is AppRuntimeConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as AppRuntimeConfig;

  return (
    typeof config.backendUrl === 'string' &&
    typeof config.budgetBaseUrl === 'string' &&
    typeof config.keycloak?.issuer === 'string' &&
    typeof config.keycloak?.clientId === 'string' &&
    typeof config.keycloak?.scheme === 'string'
  );
}
