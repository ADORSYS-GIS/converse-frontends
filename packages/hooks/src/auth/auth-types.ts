export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  /** Audience claim(s) from the access token */
  audience?: string[];
};

export type AuthSession = {
  id: 'current';
  user: AuthUser | null;
  tokens: AuthTokens | null;
};

/**
 * Configuration for JWT audience validation
 */
export type AudienceConfig = {
  /** Expected audience value(s) - token's aud claim must match at least one */
  expectedAudience: string | string[];
  /** Whether to allow tokens without an aud claim (default: false) */
  allowMissingAudience?: boolean;
  /** Whether audience validation is enabled (default: true) */
  enabled?: boolean;
};

/**
 * Authentication configuration including audience settings
 */
export type AuthConfig = {
  /** Keycloak issuer URL */
  issuer: string;
  /** OAuth2/OIDC client ID */
  clientId: string;
  /** OAuth2/OIDC scopes */
  scopes?: string[];
  /** Redirect URI for auth callbacks */
  redirectUri?: string;
  /** Custom URI scheme for mobile apps */
  scheme?: string;
  /** JWT audience validation configuration */
  audience?: AudienceConfig;
};
