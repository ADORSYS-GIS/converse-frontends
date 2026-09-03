import type { MyAccessSnapshot } from './access';
import type { SessionUser } from './session';

/**
 * Access-token claim handling: audience validation and role extraction. Pure and dependency-free
 * so it is unit-testable without the OIDC stack.
 *
 * The audience rules deliberately mirror `packages/hooks/src/auth/jwt-utils.ts`'s
 * `validateJwtAudience` and `use-keycloak-login.ts`'s `extractAndValidateAudience`, because the
 * console is replacing that code path, not reinterpreting it: validation runs on **login and on
 * every refresh**, and a mismatch **blocks** rather than warns.
 *
 * Signature verification is deliberately NOT done here. These tokens arrive over TLS directly from
 * the token endpoint of a discovered issuer, and the resource servers (`authz-api`, `authz-budget`,
 * the usage backend) each verify the signature themselves. Decoding is used only to read the
 * identity claims the chrome displays.
 *
 * **No authorization is derived here any more** (converse-frontends#452). `ADMIN_ROLE` and
 * `isAdmin(roles)` are deleted: prod minted `lightbridge-admin` for every signed-in person, so a
 * role read off a claim was never a decision anybody made. Gating now asks the backend
 * (`server/access.ts`'s `fetchMyAccess` -> `can()`); `extractRoles` survives only as the degraded
 * display fallback documented on `buildSessionUser`.
 */

export type JwtClaims = {
  sub?: string;
  aud?: string | string[];
  exp?: number;
  name?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: { roles?: unknown };
  resource_access?: Record<string, { roles?: unknown }>;
  [claim: string]: unknown;
};

/** Decodes a JWT payload without verifying it. Returns `null` on anything malformed. */
export function decodeJwtClaims(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const claims = JSON.parse(json) as unknown;
    if (typeof claims !== 'object' || claims === null) return null;
    return claims as JwtClaims;
  } catch {
    return null;
  }
}

export function normalizeAudience(aud: string | string[] | undefined): string[] | undefined {
  if (aud === undefined) return undefined;
  return Array.isArray(aud) ? aud : [aud];
}

export type AudienceCheck = {
  valid: boolean;
  audience?: string[];
  errors: string[];
};

/**
 * Mirrors `validateJwtAudience({ expectedAudience, allowMissingAudience })`:
 * - no expected audiences configured -> nothing to check, the claim is only reported;
 * - a claim present but disjoint from the expected set -> invalid;
 * - no claim at all -> invalid only when `audienceRequired`.
 */
export function checkAudience(
  token: string,
  expectedAudiences: string[],
  audienceRequired: boolean
): AudienceCheck {
  const claims = decodeJwtClaims(token);
  if (!claims) {
    return { valid: false, errors: ['Failed to decode access token'] };
  }

  const audience = normalizeAudience(claims.aud);

  if (expectedAudiences.length === 0) {
    return { valid: true, audience, errors: [] };
  }

  if (audience === undefined) {
    return audienceRequired
      ? {
          valid: false,
          audience,
          errors: ['Token missing required audience (aud) claim'],
        }
      : { valid: true, audience, errors: [] };
  }

  if (!audience.some((entry) => expectedAudiences.includes(entry))) {
    return {
      valid: false,
      audience,
      errors: [
        `Token audience mismatch. Expected one of: ${expectedAudiences.join(', ')}, ` +
          `got: ${audience.join(', ')}`,
      ],
    };
  }

  return { valid: true, audience, errors: [] };
}

function toRoleArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return value.split(' ').filter(Boolean);
  }
  return [];
}

/**
 * Collects the caller's role strings from an access token.
 *
 * `rolesClaim` (`lightbridge_api_roles` by default) is the claim the backend's own RBAC reads;
 * Keycloak's native `realm_access.roles` and `resource_access[clientId].roles` are merged in as
 * well so a realm that grants a role natively (rather than through the dedicated mapper) is still
 * reported honestly.
 *
 * Since converse-frontends#452 this feeds NOTHING but display, and only when `getMyAccess` could
 * not be reached: the permission set every gate reads is the backend's own answer, so
 * over-including here can no longer reveal anything at all.
 */
export function extractRoles(token: string, rolesClaim: string, clientId?: string): string[] {
  const claims = decodeJwtClaims(token);
  if (!claims) return [];

  const roles = new Set<string>();
  for (const role of toRoleArray(claims[rolesClaim])) roles.add(role);
  for (const role of toRoleArray(claims.realm_access?.roles)) roles.add(role);
  if (clientId) {
    for (const role of toRoleArray(claims.resource_access?.[clientId]?.roles)) roles.add(role);
  }
  return [...roles];
}

export type UserInfoLike = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
};

/**
 * Builds the session's user record from the access token's own claims, letting a `/userinfo`
 * response fill in anything the token omits. `sub` always comes from the token.
 *
 * `access` is `getMyAccess`'s answer (`server/access.ts`), fetched by the caller with this very
 * token. It is a REQUIRED argument, not an optional enrichment: a session without a resolved
 * permission set is a session no gate can evaluate, and making the caller pass one — even the
 * fail-closed unverified snapshot — is what keeps "we forgot to ask" from silently reading as
 * "this person holds nothing".
 *
 * `roles` come from the backend's own echo when the call succeeded, and from the token claim when
 * it did not, so the identity row still has something honest to show in the degraded case. Nothing
 * gates on them either way (converse-frontends#452 deleted `isAdmin`/`ADMIN_ROLE` outright).
 */
export function buildSessionUser(
  accessToken: string,
  rolesClaim: string,
  access: MyAccessSnapshot,
  clientId?: string,
  userInfo?: UserInfoLike
): SessionUser | null {
  const claims = decodeJwtClaims(accessToken);
  const sub = claims?.sub ?? userInfo?.sub;
  if (!sub) return null;

  return {
    sub,
    name: claims?.name ?? userInfo?.name,
    preferredUsername: claims?.preferred_username ?? userInfo?.preferred_username,
    email: claims?.email ?? userInfo?.email,
    platformUserId: access.userId,
    roles: access.accessVerified ? access.roles : extractRoles(accessToken, rolesClaim, clientId),
    permissions: access.permissions,
    accessVerified: access.accessVerified,
  };
}
