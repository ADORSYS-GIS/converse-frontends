/**
 * Server-side runtime configuration. Everything here is read from ordinary (non-`NEXT_PUBLIC_`)
 * environment variables at **request time**, never at module scope: `next build` imports every
 * route module, and a module-scope `throw` on a missing secret would make the build depend on
 * production secrets being present. ADR 0009 Decision 3 is what makes this possible — the browser
 * needs none of these values, so none of them are prefixed for client exposure.
 *
 * Everything under `src/server/` is server-only by construction, not by the `server-only` package:
 * these modules reach for `node:crypto` and `next/headers`, which Next refuses to bundle into a
 * client component at all. Keeping the marker package out also keeps them unit-testable under
 * plain vitest.
 */

export type ConsoleEnv = {
  keycloak: {
    issuer: string;
    clientId: string;
    /** Unset for a public client (the dev realm's `self-service` client is public + PKCE). */
    clientSecret?: string;
    scopes: string;
    /** `aud` values the access token must carry at least one of. Empty = no audience check. */
    expectedAudiences: string[];
    /** Mirrors `AudienceConfig.allowMissingAudience` inverted: when true, a token with no `aud`
     *  claim at all is rejected. Matches `EXPO_PUBLIC_KEYCLOAK_AUDIENCE_REQUIRED`'s semantics. */
    audienceRequired: boolean;
    /** Claim carrying the caller's RBAC roles. Matches `getJwtRoles`' default in
     *  `packages/hooks/src/auth/jwt-utils.ts`. */
    rolesClaim: string;
  };
  backendUrl: string;
  apiBasePath: string;
  budgetUrl: string;
  usageUrl?: string;
  sessionSecret: string;
  /** Absolute origin the browser reaches this app on. Falls back to the request's own origin. */
  publicBaseUrl?: string;
};

/**
 * Asserts a required variable is set. The caller passes the value *and* the name rather than
 * having this read `process.env[name]` dynamically: bundlers (Next's included) can only see and
 * inline a statically-written `process.env.FOO`, so a dynamic lookup is a real footgun, not just a
 * lint complaint.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[console] Missing required environment variable ${name}`);
  }
  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value !== 'false' && value !== '0';
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Strips a single trailing slash so `${base}${path}` never doubles up. */
export function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Normalises a base path to a leading slash and no trailing slash (`api` -> `/api`, `/` -> ``). */
export function normalizeBasePath(value: string): string {
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return trimTrailingSlash(withLeading);
}

export function serverEnv(): ConsoleEnv {
  const backendUrl = trimTrailingSlash(required('BACKEND_URL', process.env.BACKEND_URL));
  const sessionSecret = required('SESSION_SECRET', process.env.SESSION_SECRET);
  if (sessionSecret.length < 32) {
    throw new Error('[console] SESSION_SECRET must be at least 32 characters');
  }

  return {
    keycloak: {
      issuer: trimTrailingSlash(required('KEYCLOAK_ISSUER', process.env.KEYCLOAK_ISSUER)),
      clientId: required('KEYCLOAK_CLIENT_ID', process.env.KEYCLOAK_CLIENT_ID),
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || undefined,
      scopes: process.env.KEYCLOAK_SCOPES || 'openid profile email offline_access',
      expectedAudiences: parseList(process.env.EXPECTED_AUDIENCES),
      audienceRequired: parseBoolean(process.env.AUDIENCE_REQUIRED, true),
      rolesClaim: process.env.ROLES_CLAIM || 'lightbridge_api_roles',
    },
    backendUrl,
    apiBasePath: normalizeBasePath(process.env.API_BASE_PATH || '/api'),
    budgetUrl: trimTrailingSlash(process.env.BUDGET_URL || backendUrl),
    usageUrl: process.env.USAGE_URL ? trimTrailingSlash(process.env.USAGE_URL) : undefined,
    sessionSecret,
    publicBaseUrl: process.env.PUBLIC_BASE_URL
      ? trimTrailingSlash(process.env.PUBLIC_BASE_URL)
      : undefined,
  };
}

/** The absolute origin to build redirect URIs against, preferring the explicit deploy-time value. */
export function publicOrigin(request: Request): string {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return trimTrailingSlash(configured);
  return trimTrailingSlash(new URL(request.url).origin);
}
