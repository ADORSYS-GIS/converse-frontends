import type { AudienceConfig } from '@lightbridge/hooks';

export type KeycloakConfig = {
  issuer: string;
  clientId: string;
  scheme: string;
  /** JWT audience validation configuration */
  audience?: AudienceConfig;
};

export type AppRuntimeConfig = {
  backendUrl: string;
  keycloak: KeycloakConfig;
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
