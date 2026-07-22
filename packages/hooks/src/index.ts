export * from './accounts';
export * from './api-error';
export * from './api-keys';
export * from './authz-types';
export * from './auth-session';
export * from './keycloak-login';
export * from './locale-sync';
export * from './pagination';
export * from './projects';
export * from './sync/use-backend-sync';
export * from './sync/use-bootstrap-workspace';
export * from './use-query-state';

// Export auth types and utilities for audience validation
export type { AudienceConfig, AuthConfig } from './auth/auth-types';
export {
  decodeJwt,
  validateJwtAudience,
  getJwtAudience,
  isJwtExpired,
  getJwtSubject,
  getJwtIssuer,
  getJwtRoles,
  isAudienceValid,
} from './auth/jwt-utils';

export * from './rbac';
export * from './use-permissions';

// Export authentication error utilities
export {
  AuthenticationError,
  createAudienceError,
  isAuthenticationError,
  getAuthErrorMessage,
} from './auth/auth-errors';
export type { AuthErrorCode } from './auth/auth-errors';
