/**
 * Verified identity claims from an OIDC access token (Keycloak). Only the fields the app reads
 * are typed; signature/issuer/audience/expiry are checked by {@link verifyAccessToken}.
 *
 * Ported from `lightbridge-code-intelligence`'s `@lightbridge/auth` package (ADR 0014) — a
 * cross-repo workspace dependency isn't possible, so this app's auth layer is a local copy of
 * that package's logic rather than an import, kept behaviourally identical since both apps
 * authenticate against the exact same Keycloak realm and control plane.
 */
export interface SessionClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  exp: number;
  [claim: string]: unknown;
}
