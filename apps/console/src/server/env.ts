import { type ParsedConfigFile, getConfigPath, parseConfigFile } from './config-loader';

/**
 * Server-side runtime configuration, loaded from `config.yaml` (YAML-first, per the owner
 * directive to match lightbridge-authz's `config/default.yaml` shape — see `config-loader.ts` for
 * the placeholder-resolution mechanics and its documented divergences from authz's syntax).
 * `.env`/`.env.local` now only supply the environment variables `config.yaml`'s `{env:VAR}`
 * placeholders reference (secrets and other machine-local values); every non-secret value lives as
 * a literal in the YAML document itself.
 *
 * The document is read and validated **lazily, on first call**, never at module scope: `next
 * build` imports every route module, and a module-scope `throw` on a missing secret would make the
 * build depend on production secrets being present. ADR 0009 Decision 3 is what makes this
 * possible — the browser needs none of these values, so none of them are prefixed for client
 * exposure. The result is then cached for the lifetime of the process (`serverEnv()` is called on
 * every request across several route handlers; re-reading and re-parsing the file each time would
 * be pure per-request overhead for a document that cannot change without a restart).
 *
 * Everything under `src/server/` is server-only by construction, not by the `server-only` package:
 * these modules reach for `node:crypto` and `next/headers`, which Next refuses to bundle into a
 * client component at all. Keeping the marker package out also keeps them unit-testable under
 * plain vitest.
 */

export type ConsoleEnv = {
  idp: {
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

type RawKeycloakConfig = {
  issuer?: unknown;
  clientId?: unknown;
  clientSecret?: unknown;
  scopes?: unknown;
  expectedAudiences?: unknown;
  audienceRequired?: unknown;
  rolesClaim?: unknown;
};

type RawConsoleConfig = {
  session?: { secret?: unknown };
  idp?: RawKeycloakConfig;
  backendUrl?: unknown;
  apiBasePath?: unknown;
  budgetUrl?: unknown;
  usageUrl?: unknown;
  publicBaseUrl?: unknown;
  // `permissions` is intentionally not read here — config.yaml carries an empty-but-shaped seam
  // for the future authz-style permission model (see config.yaml's comment); wiring it up before
  // there's an engine to consume it would be dormant code.
};

/**
 * Reads a required scalar out of the resolved config, failing fast with a message naming both the
 * config key and — when the raw (pre-resolution) value at that key was a bare `{env:VAR}`
 * placeholder — the environment variable that's missing.
 */
function requiredField(parsed: ParsedConfigFile, path: readonly string[]): string {
  const resolvedValue = getConfigPath(parsed.resolved, path);
  if (typeof resolvedValue === 'string' && resolvedValue !== '') return resolvedValue;

  const configKey = path.join('.');
  const rawValue = getConfigPath(parsed.raw, path);
  if (typeof rawValue === 'string') {
    const placeholderMatch = rawValue.match(/^\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/);
    if (placeholderMatch) {
      throw new Error(
        `[console] config.yaml key "${configKey}" references {env:${placeholderMatch[1]}}, but ` +
          `${placeholderMatch[1]} is not set (${parsed.absolutePath})`
      );
    }
  }
  throw new Error(
    `[console] config.yaml is missing a required value for "${configKey}" (${parsed.absolutePath})`
  );
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function asStringWithFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') return value !== 'false' && value !== '0';
  return fallback;
}

/** Accepts either a real YAML array or a comma-separated string (the latter so a single
 *  `{env:VAR}` placeholder can drive the whole list, mirroring authz's `billing.plans`/`models`
 *  "single JSON-array string for fully env-driven setups" escape hatch). */
function parseAudienceList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
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

/** Builds the typed config from an already-parsed+resolved config document. Exported (in addition
 *  to `serverEnv()`) so loader tests can validate this step against an in-memory document without
 *  touching the filesystem. */
export function buildConsoleEnv(parsed: ParsedConfigFile): ConsoleEnv {
  const raw = (parsed.resolved ?? {}) as RawConsoleConfig;

  const backendUrl = trimTrailingSlash(requiredField(parsed, ['backendUrl']));
  const sessionSecret = requiredField(parsed, ['session', 'secret']);
  if (sessionSecret.length < 32) {
    throw new Error(
      `[console] config.yaml key "session.secret" must resolve to at least 32 characters ` +
        `(${parsed.absolutePath})`
    );
  }

  const idp = raw.idp ?? {};
  const usageUrl = asOptionalString(raw.usageUrl);

  return {
    idp: {
      issuer: trimTrailingSlash(requiredField(parsed, ['idp', 'issuer'])),
      clientId: requiredField(parsed, ['idp', 'clientId']),
      clientSecret: asOptionalString(idp.clientSecret),
      scopes: asStringWithFallback(idp.scopes, 'openid profile email offline_access'),
      expectedAudiences: parseAudienceList(idp.expectedAudiences),
      audienceRequired: parseBoolean(idp.audienceRequired, true),
      rolesClaim: asStringWithFallback(idp.rolesClaim, 'lightbridge_api_roles'),
    },
    backendUrl,
    apiBasePath: normalizeBasePath(asStringWithFallback(raw.apiBasePath, '/api')),
    budgetUrl: trimTrailingSlash(asStringWithFallback(raw.budgetUrl, backendUrl)),
    usageUrl: usageUrl ? trimTrailingSlash(usageUrl) : undefined,
    sessionSecret,
    publicBaseUrl: asOptionalString(raw.publicBaseUrl)
      ? trimTrailingSlash(raw.publicBaseUrl as string)
      : undefined,
  };
}

let cachedConsoleEnv: ConsoleEnv | undefined;

export function serverEnv(): ConsoleEnv {
  if (!cachedConsoleEnv) {
    cachedConsoleEnv = buildConsoleEnv(parseConfigFile());
  }
  return cachedConsoleEnv;
}

/** Test-only: clears the process-lifetime cache so a test can reload with a different
 *  `CONSOLE_CONFIG`/fixture. Never called from production code. */
export function __resetServerEnvCacheForTests(): void {
  cachedConsoleEnv = undefined;
}

/** The absolute origin to build redirect URIs against, preferring the explicit deploy-time value. */
export function publicOrigin(request: Request): string {
  const configured = serverEnv().publicBaseUrl;
  if (configured) return trimTrailingSlash(configured);
  return trimTrailingSlash(new URL(request.url).origin);
}
