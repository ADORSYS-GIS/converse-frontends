import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { AppRuntimeConfig, UsageDashboardConfig } from './runtime-config-types';
import { isAppRuntimeConfig } from './runtime-config-types';

const RuntimeConfigContext = createContext<AppRuntimeConfig | null>(null);

// Default to the `my-usage` dashboard (uid + slug) the observability stack ships;
// overridable so a different dashboard/uid can be pointed at without a rebuild.
const DEFAULT_USAGE_DASHBOARD_PATH = '/d/my-usage/ai-gateway-e28094-my-usage';

/**
 * Resolves `budgetBaseUrl`: an explicit non-empty value wins, otherwise falls back to
 * `backendUrl`. `authz-budget`'s ingress is not enabled anywhere yet, so most deployments won't
 * set `EXPO_PUBLIC_BUDGET_URL` / `config.json`'s `budgetBaseUrl` for a while -- falling back keeps
 * the app functional (budget calls will 404 against `authz-api`, same as before this field
 * existed) instead of throwing on a missing required value.
 */
function resolveBudgetBaseUrl(raw: unknown, backendUrl: unknown): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed) {
    return trimmed;
  }
  return typeof backendUrl === 'string' ? backendUrl : '';
}

/**
 * Builds the optional usage-dashboard config. Returns `undefined` (Usage tab
 * hidden) unless a Grafana base URL is provided. Trailing slashes on the base
 * URL are trimmed so the iframe URL joins cleanly.
 */
function buildUsageConfig(
  grafanaUrl: string | undefined,
  dashboardPath: string | undefined
): UsageDashboardConfig | undefined {
  const trimmed = grafanaUrl?.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return undefined;
  }
  return {
    grafanaUrl: trimmed,
    dashboardPath: dashboardPath?.trim() || DEFAULT_USAGE_DASHBOARD_PATH,
  };
}

/**
 * Resolves the optional config-driven logo URL (ADR 0008 Decision 8). Returns `undefined`
 * (header renders nothing) unless a non-empty value is provided, same "unset, not disabled"
 * posture as `buildUsageConfig` above.
 */
function resolveLogoUrl(raw: unknown): string | undefined {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed || undefined;
}

function getEnvConfig(): AppRuntimeConfig {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const apiBasePath = process.env.EXPO_PUBLIC_API_BASE_PATH;
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
  const scheme = process.env.EXPO_PUBLIC_KEYCLOAK_SCHEME;

  if (!backendUrl || !issuer || !clientId || !scheme) {
    throw new Error('Missing required EXPO_PUBLIC_* config values.');
  }

  // Parse audience configuration from environment variables
  const expectedAudience = process.env.EXPO_PUBLIC_KEYCLOAK_EXPECTED_AUDIENCE;
  const audienceRequired = process.env.EXPO_PUBLIC_KEYCLOAK_AUDIENCE_REQUIRED;

  // AUDIENCE_REQUIRED=false means validation is completely disabled
  // AUDIENCE_REQUIRED=true (or not set) means validation is enabled
  const isValidationEnabled = audienceRequired !== 'false';

  // Build audience config if expected audience is set and validation is enabled
  const audienceConfig =
    expectedAudience && isValidationEnabled
      ? {
          expectedAudience: expectedAudience.includes(',')
            ? expectedAudience.split(',').map((a: string) => a.trim())
            : expectedAudience,
          allowMissingAudience: false, // If validation is enabled, audience is required
          enabled: true,
        }
      : undefined;

  return {
    backendUrl,
    apiBasePath: apiBasePath || undefined,
    budgetBaseUrl: resolveBudgetBaseUrl(process.env.EXPO_PUBLIC_BUDGET_URL, backendUrl),
    keycloak: {
      issuer,
      clientId,
      scheme,
      audience: audienceConfig,
    },
    usage: buildUsageConfig(
      process.env.EXPO_PUBLIC_GRAFANA_URL,
      process.env.EXPO_PUBLIC_GRAFANA_USAGE_DASHBOARD_PATH
    ),
    logoUrl: resolveLogoUrl(process.env.EXPO_PUBLIC_LOGO_URL),
  };
}

async function fetchWebConfig(): Promise<AppRuntimeConfig> {
  if (typeof document === 'undefined') {
    throw new TypeError('config.json is not available without a document.');
  }

  const url = new URL('/config.json', document.baseURI).toString();
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load config.json (${response.status}).`);
  }

  const json = await response.json();

  // Resolve before validating so `isAppRuntimeConfig`'s `budgetBaseUrl` string check sees the
  // fallback-applied value, not a possibly-absent/empty raw field straight off the wire.
  json.budgetBaseUrl = resolveBudgetBaseUrl((json as any).budgetBaseUrl, (json as any).backendUrl);

  if (!isAppRuntimeConfig(json)) {
    throw new Error('Invalid config.json payload.');
  }

  const rawKeycloak = (json as any).keycloak || {};
  const expectedAudience = rawKeycloak.expectedAudience;
  const audienceRequired = rawKeycloak.audienceRequired;

  const isValidationEnabled = audienceRequired !== 'false';

  const audienceConfig =
    expectedAudience && isValidationEnabled
      ? {
          expectedAudience: expectedAudience.includes(',')
            ? expectedAudience.split(',').map((a: string) => a.trim())
            : expectedAudience,
          allowMissingAudience: false,
          enabled: true,
        }
      : undefined;

  if (audienceConfig) {
    json.keycloak.audience = audienceConfig;
  }

  const rawUsage = (json as any).usage || {};
  json.usage = buildUsageConfig(rawUsage.grafanaUrl, rawUsage.dashboardPath);

  json.logoUrl = resolveLogoUrl((json as any).logoUrl);

  // envsubst leaves an empty string (not an absent field) when EXPO_PUBLIC_API_BASE_PATH is
  // unset on a given deployment — normalize to undefined so the authz-rpc client falls back to
  // its own default basePath ('/api') instead of an empty-string prefix.
  json.apiBasePath = (json as any).apiBasePath || undefined;

  return json;
}

async function loadRuntimeConfig(): Promise<AppRuntimeConfig> {
  const isProd = process.env.NODE_ENV === 'production';
  const isWeb = Platform.OS === 'web';

  if (isProd && isWeb) {
    return await fetchWebConfig();
  }

  return getEnvConfig();
}

export function RuntimeConfigProvider({
  children,
  fallback = null,
  onReady,
}: Readonly<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReady?: (config: AppRuntimeConfig) => void;
}>) {
  const [config, setConfig] = useState<AppRuntimeConfig | null>(null);
  const onReadyRef = React.useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let mounted = true;

    loadRuntimeConfig()
      .then((next) => {
        if (mounted) {
          setConfig(next);
          onReadyRef.current?.(next);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  if (!config) {
    return <>{fallback}</>;
  }

  return <RuntimeConfigContext.Provider value={config}>{children}</RuntimeConfigContext.Provider>;
}

export function useRuntimeConfig(): AppRuntimeConfig {
  const config = useContext(RuntimeConfigContext);

  if (!config) {
    throw new Error('Runtime config is not ready.');
  }

  return config;
}
