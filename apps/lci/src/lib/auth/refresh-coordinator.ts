import type { OidcClientConfig } from './oidc-config';
import { type AuthResult, performRefreshGrant, type RefreshGrantResult } from './refresh-grant';

/**
 * A refresh token can only be redeemed once — the IdP issues a new one and invalidates the old.
 * Two concurrent requests presenting the same (not-yet-rotated) refresh token would otherwise
 * both exchange it: the first succeeds, and the second submits a token the IdP now considers
 * already used, which many providers read as replay and answer by revoking the whole session —
 * not just the losing request, the winning one too.
 *
 * This keeps at most one exchange in flight per refresh-token value; a second caller holding the
 * same token awaits the first call's result instead of racing it. Module-scoped, so it covers
 * every request this process handles for as long as it stays warm.
 */
const inFlight = new Map<string, Promise<AuthResult<RefreshGrantResult>>>();

export function refreshOnce(
  refreshToken: string,
  config: OidcClientConfig
): Promise<AuthResult<RefreshGrantResult>> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const promise = performRefreshGrant(refreshToken, config).finally(() => {
    inFlight.delete(refreshToken);
  });
  inFlight.set(refreshToken, promise);
  return promise;
}
