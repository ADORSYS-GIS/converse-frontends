export type AppRuntimeConfig = {
  backendUrl: string;
  usageUrl?: string;
  gatewayUrl?: string;
  gatewayBearerToken?: string;
  analyticsUrl?: string;
  keycloak: {
    issuer: string;
    clientId: string;
    scheme: string;
  };
};

export function isAppRuntimeConfig(value: unknown): value is AppRuntimeConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as AppRuntimeConfig;

  return (
    typeof config.backendUrl === 'string' &&
    (config.usageUrl === undefined || typeof config.usageUrl === 'string') &&
    (config.gatewayBearerToken === undefined || typeof config.gatewayBearerToken === 'string') &&
    typeof config.keycloak?.issuer === 'string' &&
    typeof config.keycloak?.clientId === 'string' &&
    typeof config.keycloak?.scheme === 'string'
  );
}
