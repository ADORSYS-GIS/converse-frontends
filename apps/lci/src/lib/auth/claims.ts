/**
 * Verified identity claims from an OIDC access token (Keycloak). Only the fields the app reads
 * are typed; signature/issuer/audience/expiry are checked by {@link verifyAccessToken}.
 *
 * This app's auth layer is implemented locally rather than as a workspace import, since the
 * shared package it corresponds to lives in a different repository — it stays behaviourally
 * identical because both apps authenticate against the same Keycloak realm and control plane.
 */
export interface SessionClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  exp: number;
  [claim: string]: unknown;
}
