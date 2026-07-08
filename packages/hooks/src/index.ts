export * from './accounts';
export * from './api-keys';
export * from './auth-session';
export * from './keycloak-login';
export * from './locale-sync';
export * from './pagination';
export * from './projects';
export * from './sync/use-backend-sync';
export * from './usage';
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
  isAudienceValid
} from './auth/jwt-utils';

// Export authentication error utilities
export {
  AuthenticationError,
  createAudienceError,
  isAuthenticationError,
  getAuthErrorMessage
} from './auth/auth-errors';
export type { AuthErrorCode } from './auth/auth-errors';
