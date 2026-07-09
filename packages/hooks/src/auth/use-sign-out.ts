import { clearPersistedAuthSession, getLatestAuthSession } from './use-auth-session';
import { endKeycloakSession, type KeycloakConfig } from './use-keycloak-login';

/**
 * Config needed to also terminate the Keycloak SSO session on sign-out.
 * When omitted, `signOut` only clears the locally persisted session.
 */
export type SignOutConfig = Pick<
  KeycloakConfig,
  'issuer' | 'clientId' | 'scheme' | 'redirectUri'
> & {
  postLogoutRedirectUri?: string;
};

export function useSignOut(config?: SignOutConfig) {
  const signOut = async () => {
    // Capture the id token before we wipe the local session — Keycloak uses it
    // as the `id_token_hint` to identify which session to end.
    const idToken = getLatestAuthSession().tokens?.idToken;

    try {
      if (config?.issuer) {
        await endKeycloakSession(config, idToken);
      }
    } catch (error) {
      // Never let an IdP round-trip failure strand the user in a logged-in
      // state locally — fall through and clear the persisted session below.
      console.error('[Auth] IdP end-session failed during sign-out:', error);
    } finally {
      await clearPersistedAuthSession();
    }
  };

  return { signOut };
}
