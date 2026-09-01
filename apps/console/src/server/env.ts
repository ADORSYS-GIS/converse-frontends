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
  /**
   * Client certificate for the usage backend's query listener, which requires mTLS
   * (lightbridge-authz#347/#361) and has no bearer-token auth of its own. Unset on any deployment
   * that has no usage backend wired up; `usage-dispatcher.ts` then yields no dispatcher and the
   * usage routes answer their honest 503.
   */
  usageClientCert?: { certPath: string; keyPath: string };
  sessionSecret: string;
  /** Absolute origin the browser reaches this app on. Falls back to the request's own origin. */
  publicBaseUrl?: string;
  /**
   * Runtime white-label branding (issue #368, Phase H; per-theme logos addendum, owner directive
   * 2026-08-31 "White is for dark themes"), read straight off disk by `GET /branding/logo` /
   * `GET /branding/logo-light` / `GET /branding/override.css`. `logo`/`style` are independently
   * optional; absent means today's behaviour exactly (the built-in mark, no override stylesheet
   * link). `logoLight` is NOT independently optional — see `buildBrandingConfig`'s own doc
   * comment: it is a light-theme (`wireframe`) counterpart to `logo` (the default AND dark-theme
   * mark), and fails config parsing when present without `logo`.
   */
  branding?: {
    /** Host-absolute path to the logo file. Extension decides the served `Content-Type`. Also
     *  the dark-theme (`black`) mark when `logoLightPath` is present. */
    logoPath?: string;
    /** The extension `logoPath` was validated against — avoids re-deriving it per request. */
    logoContentType?: string;
    /** Host-absolute path to the light-theme (`wireframe`) counterpart logo. Only ever set
     *  alongside `logoPath` — see `buildBrandingConfig`. */
    logoLightPath?: string;
    /** The extension `logoLightPath` was validated against. */
    logoLightContentType?: string;
    /** Host-absolute path to a CSS file holding daisyUI custom-property overrides only. */
    stylePath?: string;
  };
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
  usageClientCert?: { certPath?: unknown; keyPath?: unknown };
  publicBaseUrl?: unknown;
  branding?: { logo?: unknown; logoLight?: unknown; style?: unknown };
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

/**
 * `branding.logo`'s extension -> the `Content-Type` `GET /branding/logo` serves it with.
 * Deliberately narrow (issue #368): only formats a `<img>`/`<link rel="icon">`-shaped logo
 * realistically ships as. Anything else fails config parsing rather than surfacing as a
 * request-time 500 or an honest-looking image response with the wrong MIME type.
 */
const BRANDING_LOGO_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/**
 * Validates one logo path — shared by `branding.logo` and `branding.logoLight` (per-theme logos
 * addendum), which carry the identical host-absolute-path + extension-allow-list contract, just
 * against two different config keys. `fieldLabel` is the fully-qualified key name, used verbatim
 * in both error messages so a failure names exactly the YAML key an operator needs to fix.
 */
function validateBrandingLogoPath(
  fieldLabel: string,
  logoPath: string,
  parsed: ParsedConfigFile
): string {
  if (!logoPath.startsWith('/')) {
    throw new Error(
      `[console] config.yaml key "${fieldLabel}" must be a host-absolute path, got ` +
        `"${logoPath}" (${parsed.absolutePath})`
    );
  }
  const extensionMatch = logoPath.match(/\.[^./\\]+$/);
  const extension = extensionMatch?.[0].toLowerCase();
  const contentType = extension ? BRANDING_LOGO_CONTENT_TYPES[extension] : undefined;
  if (!contentType) {
    throw new Error(
      `[console] config.yaml key "${fieldLabel}" must end in one of ` +
        `${Object.keys(BRANDING_LOGO_CONTENT_TYPES).join(', ')} (got "${logoPath}"), ` +
        `(${parsed.absolutePath})`
    );
  }
  return contentType;
}

/**
 * Validates and resolves `branding.logo`/`branding.logoLight`/`branding.style`. `logo` and
 * `style` are independently optional — see `config.yaml`'s own comment on why there is no
 * both-or-neither pairing here, unlike `usageClientCert`. Each configured path must be
 * host-absolute: these are read straight off disk by `GET /branding/logo`/
 * `GET /branding/logo-light`/`GET /branding/override.css`, not resolved against the app's own
 * working directory, so a relative path is always a config mistake, not a valid deployment
 * shape — fail fast at boot rather than 404ing on every request forever.
 *
 * `logoLight` (per-theme logos addendum, owner directive 2026-08-31 "White is for dark themes")
 * is deliberately NOT independently optional like `logo`/`style` are: it is a light-theme
 * (`wireframe`) COUNTERPART to `logo` (which doubles as both the default mark and the dark-theme
 * mark, per `config.yaml`'s own comment) — a `logoLight`-without-`logo` deployment would render no
 * logo at all under `black`, this console's default theme, which is never what an operator setting
 * `logoLight` actually wants. Fails fast at boot, the same "config error, not a 404" reasoning as
 * the host-absolute-path/extension checks above.
 */
function buildBrandingConfig(
  raw: { logo?: unknown; logoLight?: unknown; style?: unknown } | undefined,
  parsed: ParsedConfigFile
): ConsoleEnv['branding'] {
  const logoPath = asOptionalString(raw?.logo)?.trim() || undefined;
  const logoLightPath = asOptionalString(raw?.logoLight)?.trim() || undefined;
  const stylePath = asOptionalString(raw?.style)?.trim() || undefined;

  if (!logoPath && !logoLightPath && !stylePath) return undefined;

  if (logoLightPath && !logoPath) {
    throw new Error(
      `[console] config.yaml key "branding.logoLight" requires "branding.logo" to also be set ` +
        `— a light-theme-only brand has no mark for "black", the default theme ` +
        `(${parsed.absolutePath})`
    );
  }

  const logoContentType = logoPath
    ? validateBrandingLogoPath('branding.logo', logoPath, parsed)
    : undefined;
  const logoLightContentType = logoLightPath
    ? validateBrandingLogoPath('branding.logoLight', logoLightPath, parsed)
    : undefined;

  if (stylePath && !stylePath.startsWith('/')) {
    throw new Error(
      `[console] config.yaml key "branding.style" must be a host-absolute path, got ` +
        `"${stylePath}" (${parsed.absolutePath})`
    );
  }

  return {
    ...(logoPath ? { logoPath, logoContentType } : {}),
    ...(logoLightPath ? { logoLightPath, logoLightContentType } : {}),
    ...(stylePath ? { stylePath } : {}),
  };
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
  // Both halves or neither: a cert without a key (or vice versa) cannot produce a working TLS
  // identity, so treating a half-configured block as "configured" would turn a config typo into a
  // per-request handshake failure instead of the same honest 503 an unconfigured deployment gets.
  // Trimmed, unlike `asOptionalString`'s plain `!== ''` check: these are FILE PATHS resolved from
  // a mounted volume, and a `{env:VAR}` placeholder that resolves to whitespace is a realistic
  // config accident. Untrimmed, `'   '` counts as configured and the failure surfaces later as a
  // `readFileSync` error logged on every boot; trimmed, it is simply unconfigured and the usage
  // routes give their honest 503. Kept local rather than changed inside `asOptionalString`, whose
  // other callers are URLs and secrets with their own validation.
  const usageCertPath = asOptionalString(raw.usageClientCert?.certPath)?.trim() || undefined;
  const usageKeyPath = asOptionalString(raw.usageClientCert?.keyPath)?.trim() || undefined;
  const usageClientCert =
    usageCertPath && usageKeyPath ? { certPath: usageCertPath, keyPath: usageKeyPath } : undefined;

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
    usageClientCert,
    sessionSecret,
    publicBaseUrl: asOptionalString(raw.publicBaseUrl)
      ? trimTrailingSlash(raw.publicBaseUrl as string)
      : undefined,
    branding: buildBrandingConfig(raw.branding, parsed),
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
