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
};

export type AuthSession = {
  id: 'current';
  user: AuthUser | null;
  tokens: AuthTokens | null;
};
