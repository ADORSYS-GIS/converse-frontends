# apps/console — Server Configuration (`config.yaml`)

> Sources:
>
> - `apps/console/src/server/config-loader.ts` — YAML read/parse + `{env:VAR}` resolution
> - `apps/console/src/server/env.ts` — typed `ConsoleEnv`, defaults, validation, `serverEnv()`
> - `apps/console/config.yaml` — the primary config document (committed, dev defaults)
> - `apps/console/config.wiremock.yaml` — the wiremock-backed dev variant
> - `apps/console/.env.example` — the only two env vars `config.yaml` references, plus
>   `CONSOLE_CONFIG` itself
>
> For the auth/session model that consumes `keycloak.*` and `session.secret`, see
> `auth-and-identity.md`. For the proxy layer that consumes `backendUrl`/`apiBasePath`/`budgetUrl`/
> `usageUrl`, see `rpc-and-codegen.md`.

---

## Why YAML, not `.env`

`apps/console` deliberately does **not** follow the Expo apps' `EXPO_PUBLIC_*` / `.env` convention.
Its config is **YAML-first**, matching `lightbridge-authz`'s `config/default.yaml` shape (owner
directive, recorded in both `config-loader.ts`'s header comment and `config.yaml`'s own header):

- `config.yaml` (checked into git, at the app root) is the **primary config document** — session,
  Keycloak/OIDC, backends, and public origin all live there as plain YAML.
- `.env`/`.env.local` supply **only** the environment variables that `config.yaml`'s `{env:VAR}`
  placeholders reference — in practice just two: `SESSION_SECRET` (required) and
  `KEYCLOAK_CLIENT_SECRET` (optional) — plus the loader-selection variable `CONSOLE_CONFIG` itself.
- Nothing here ever reaches the browser (ADR 0009 Decision 3: the console is the only exposed
  origin, the browser only ever talks to same-origin `/api/*`). There is no `EXPO_PUBLIC_*`/
  `config.json`/envsubst machinery to mirror.

The rule for **where a new value belongs**: is it a genuine secret (session key material, a
confidential client secret)? It's a `{env:VAR}` placeholder. Is it a safe value to check in for
local dev, even if a real deployment would want something different (an issuer URL, a backend
URL)? It's a plain YAML literal — a real deployment ships its **own** `config.yaml` and points
`CONSOLE_CONFIG` at it, rather than overriding individual non-secret fields through the
environment.

---

## Key schema

All types, required/optional status, and defaults below are read directly out of
`buildConsoleEnv()` in `apps/console/src/server/env.ts` (`RawConsoleConfig`/`RawKeycloakConfig` for
shape, `requiredField`/`asStringWithFallback`/`parseBoolean`/`parseAudienceList` for the
required/default rules) and cross-checked against the literals shipped in `apps/console/config.yaml`.

| YAML key                     | Type                                         | Required | Default when absent                                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.secret`             | string, ≥ 32 chars                           | **Yes**  | — (fails fast)                                                                              | JWE key material (A256GCM via HKDF). `env.ts` throws if resolved length `< 32`. Always a `{env:VAR}` placeholder, never a literal, even in dev.                                                                                                                                                                                                                                                                                                    |
| `keycloak.issuer`            | string (URL)                                 | **Yes**  | — (fails fast)                                                                              | Trailing slash stripped (`trimTrailingSlash`). OIDC discovery resolves every other endpoint from this.                                                                                                                                                                                                                                                                                                                                             |
| `keycloak.clientId`          | string                                       | **Yes**  | — (fails fast)                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `keycloak.clientSecret`      | string \| unset                              | No       | `undefined`                                                                                 | Only for a confidential client (`client_secret_post`). Unset ⇒ public client + PKCE. `asOptionalString`: empty string also collapses to `undefined`.                                                                                                                                                                                                                                                                                               |
| `keycloak.scopes`            | string (space-separated)                     | No       | `'openid profile email offline_access'`                                                     | `offline_access` is what makes silent refresh possible.                                                                                                                                                                                                                                                                                                                                                                                            |
| `keycloak.expectedAudiences` | `string[]` **or** comma-separated string     | No       | `[]` (empty = skip the audience check — not recommended)                                    | `parseAudienceList` accepts either a real YAML array (`config.yaml` uses this form) or a single comma-separated string, so one `{env:VAR}` placeholder can drive the whole list if needed.                                                                                                                                                                                                                                                         |
| `keycloak.audienceRequired`  | boolean (or `'true'`/`'false'`/`'0'` string) | No       | `true`                                                                                      | `parseBoolean`: any string other than exactly `'false'`/`'0'` is truthy. `false` allows a token with **no** `aud` claim at all; a **wrong** `aud` is always rejected regardless of this flag.                                                                                                                                                                                                                                                      |
| `keycloak.rolesClaim`        | string                                       | No       | `'lightbridge_api_roles'`                                                                   | Matches `getJwtRoles`'s default in `packages/hooks/src/auth/jwt-utils.ts`. Keycloak's `realm_access`/`resource_access` roles are merged in as well.                                                                                                                                                                                                                                                                                                |
| `backendUrl`                 | string (URL)                                 | **Yes**  | — (fails fast)                                                                              | authz-api base URL. Trailing slash stripped.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `apiBasePath`                | string                                       | No       | `'/api'`                                                                                    | `normalizeBasePath`: forces a leading slash, strips a _trailing_ slash only — `'/'` normalizes to `''` (not the `/api` default), which is exactly what `config.wiremock.yaml` relies on for wiremock's unprefixed `/rpc/{op_id}` stubs.                                                                                                                                                                                                            |
| `budgetUrl`                  | string (URL)                                 | No       | falls back to `backendUrl`                                                                  | authz-budget base URL (the 14 `budget:*`-gated procedures).                                                                                                                                                                                                                                                                                                                                                                                        |
| `usageUrl`                   | string (URL) \| unset                        | No       | `undefined`                                                                                 | Left unset in `config.yaml` — no local usage backend; `/api/usage/*` then answers `503` and the Overview shows an honest "unwired" status instead of a fake zero.                                                                                                                                                                                                                                                                                  |
| `publicBaseUrl`              | string (URL) \| unset                        | No       | `undefined` → falls back to the incoming request's own origin at runtime (`publicOrigin()`) | The absolute origin browsers reach this app on — builds the OIDC redirect URI, the RP-initiated logout redirect, and the `/.well-known/oauth-protected-resource` `resource` identifier. The request-origin fallback is correct for local dev but **not** behind a proxy that rewrites `Host`; a real deployment sets this explicitly.                                                                                                              |
| `permissions`                | object (shape open)                          | No       | n/a — **not read** by `env.ts` at all                                                       | Seam only, no engine yet. Deliberately not consumed by `buildConsoleEnv()`/`ConsoleEnv` — wiring up a field nothing reads would be dormant code. Modeled on `lightbridge-authz`'s `oauth2.rbac` block (role → permission-grant mapping, `*` / `<resource>:*` / `<resource>:<action>` grants) as the eventual shape once the console grows its own RBAC-in-config story. Today `config.yaml` ships it as `permissions: {}` and nothing looks at it. |

A field with no row above (e.g. anything nested deeper than what's listed) is simply not read —
`buildConsoleEnv()` only destructures the keys in the table.

---

## `{env:VAR}` interpolation semantics

Implemented in `resolveEnvPlaceholders()`/`resolveConfigEnv()`, `apps/console/src/server/config-loader.ts:39-86`.
This is a **deliberate, documented divergence** from `lightbridge-authz`'s `${VAR}`-style syntax
(`config-loader.ts`'s own header comment cites the authz reference implementation directly:
`crates/lightbridge-authz-core/src/config/mod.rs`'s `interpolate_env_vars`).

|                                                         | authz (`lightbridge-authz`)                           | console (this loader)                                                               |
| ------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Placeholder forms                                       | `$VAR`, `${VAR}`, `${VAR-default}`, `${VAR:-default}` | **Only** `{env:VAR}` — no inline default-value operator at all                      |
| Unset/empty, placeholder is the whole value             | Resolves to `""` (empty string)                       | Resolves to **`undefined`**                                                         |
| Unset/empty, placeholder is embedded in a larger string | Resolves the placeholder to `""`                      | Resolves the placeholder to `''` (same behavior — see below)                        |
| A default value with no env override                    | Written as `${VAR:-default}`                          | Written as a **plain YAML literal** instead — no placeholder syntax involved at all |

The pattern is `/\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g` — a name starting with a letter or
underscore, then letters/digits/underscores. Two resolution paths, chosen by whether the
placeholder is the _entire_ string value or only _part_ of one:

1. **Whole-string placeholder** (e.g. `session.secret: '{env:SESSION_SECRET}'`, the entire YAML
   scalar is exactly one `{env:VAR}` and nothing else): resolves to `process.env[VAR]`, or to
   **`undefined`** if the variable is unset _or_ set to the empty string. This is what lets
   `env.ts`'s `requiredField()` treat a missing/blank required secret as "absent" and fail fast at
   startup, naming both the config key and the environment variable — instead of authz's behavior
   of starting successfully on a blank `""` value and breaking later, downstream, in a less obvious
   place.
2. **Embedded placeholder** (e.g. `'https://{env:HOST}/base'`, or multiple placeholders in one
   string): each occurrence is substituted with `process.env[VAR] ?? ''` — an unset variable
   collapses to an empty string inline, matching authz's `$VAR`/`${VAR}` behavior, because there is
   no sensible way to represent "half of a string is `undefined`".

`resolveConfigEnv()` deep-walks the parsed YAML document (objects, arrays, string leaves);
non-string scalars (numbers, booleans, `null`) pass through untouched since YAML already typed
them.

### Missing-required-value error shape

`env.ts`'s `requiredField()` (`apps/console/src/server/env.ts:78-96`) is what turns an
`undefined` resolution into a fail-fast startup error. It re-reads the **raw** (pre-resolution)
value at the same config path and, if that raw value was itself a bare `{env:VAR}` placeholder,
names _both_ the config key and the missing environment variable:

```
[console] config.yaml key "session.secret" references {env:SESSION_SECRET}, but SESSION_SECRET
is not set (/abs/path/to/config.yaml)
```

If the raw value wasn't a placeholder at all (e.g. the key is simply missing from the document), the
error instead names just the config key:

```
[console] config.yaml is missing a required value for "keycloak.issuer" (/abs/path/to/config.yaml)
```

The four required keys that go through `requiredField()`: `session.secret`, `keycloak.issuer`,
`keycloak.clientId`, `backendUrl`.

---

## `CONSOLE_CONFIG` — which file gets loaded

`parseConfigFile()` (`apps/console/src/server/config-loader.ts:105-130`) resolves the document
path as:

```
process.env.CONSOLE_CONFIG || './config.yaml'
```

resolved against `process.cwd()` — the console app's own directory when run via
`pnpm --filter console dev|start` or `turbo run build:web`. A missing file or invalid YAML throws
immediately, naming the resolved absolute path and (for a missing file) the `CONSOLE_CONFIG` value
that produced it; `parseConfigFile()` never returns a partial document.

The document is read, parsed, and validated **lazily**, on the first call to `serverEnv()`
(`apps/console/src/server/env.ts:184-189`) — never at module scope. `next build` imports every
route module; a module-scope `throw` on a missing secret would make the _build_ depend on
production secrets being present. The result is then cached for the process lifetime (`serverEnv()`
runs on every request across several route handlers — re-reading/re-parsing per request would be
pure overhead for a document that cannot change without a restart). `__resetServerEnvCacheForTests()`
exists solely so a test can reload with a different fixture; it is never called from production
code.

### `config.wiremock.yaml` — the no-backend dev variant

`apps/console/config.wiremock.yaml` is `config.yaml` with exactly three fields swapped
(`backendUrl`, `apiBasePath`, `budgetUrl`) to point at the repo's `wiremock` compose service
(port 18888) instead of a real `lightbridge-authz` checkout. Everything else — `session`,
`keycloak.*`, `publicBaseUrl`, `permissions` — is unchanged; wiremock only stands in for
authz-api/authz-budget, not Keycloak (`docker compose up -d keycloak-26` is still required for
login).

`apiBasePath: '/'` there is deliberate, not a typo for the usual `/api`: `normalizeBasePath()`
only strips a _trailing_ slash, so an empty string would fall back to the `/api` default via
`asStringWithFallback`, but `'/'` itself normalizes to `''` — matching the unprefixed
`/rpc/{op_id}` paths `wiremock/mappings/mapping.json` stubs.

Point `CONSOLE_CONFIG` at it to use it:

```bash
CONSOLE_CONFIG=./config.wiremock.yaml pnpm --filter console dev
```

---

## What belongs in `.env` vs. `config.yaml`

| Goes in `.env`/`.env.local`                                                              | Goes in `config.yaml`                                                                                           |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET` — always, it's a secret regardless of how low-stakes the local value is | `keycloak.issuer`, `backendUrl`, `budgetUrl`, `usageUrl`, `publicBaseUrl` — safe to check in as dev literals    |
| `KEYCLOAK_CLIENT_SECRET` — only when the client is confidential                          | `keycloak.scopes`, `expectedAudiences`, `audienceRequired`, `rolesClaim` — not secrets                          |
| `CONSOLE_CONFIG` — selects _which_ YAML document to load (not a config value itself)     | Everything a real deployment might want to change: ship a different `config.yaml`, don't add env vars per field |

`.env.example` (`apps/console/.env.example`) documents exactly these three variables and nothing
else — it is intentionally short.

---

## Worked example

Local dev, real backend, default `config.yaml`, `.env` containing only:

```bash
SESSION_SECRET=$(openssl rand -base64 48)
# KEYCLOAK_CLIENT_SECRET left unset — the dev realm's `self-service` client is public + PKCE
```

Resolution at startup (see the sequence diagram below): `session.secret: '{env:SESSION_SECRET}'`
resolves to the generated value (≥ 32 chars, passes validation); `keycloak.clientSecret:
'{env:KEYCLOAK_CLIENT_SECRET}'` resolves to `undefined` (whole-string placeholder, variable unset)
and is treated as "no client secret" — correct, since the dev client is public. Every other field
(`keycloak.issuer`, `backendUrl`, `expectedAudiences`, …) is a plain literal already, so nothing
else touches the environment. The resulting `ConsoleEnv`:

```ts
{
  keycloak: {
    issuer: 'http://localhost:13444/realms/lightbridge-dev',
    clientId: 'self-service',
    clientSecret: undefined,
    scopes: 'openid profile email offline_access',
    expectedAudiences: ['converse-frontend'],
    audienceRequired: true,
    rolesClaim: 'lightbridge_api_roles',
  },
  backendUrl: 'http://localhost:13000',
  apiBasePath: '/api',
  budgetUrl: 'http://localhost:13005',
  usageUrl: undefined,
  sessionSecret: '<48-byte base64 string>',
  publicBaseUrl: 'http://localhost:3000',
}
```

---

## Config resolution at startup

```mermaid
sequenceDiagram
    participant Route as Route handler / middleware caller
    participant Env as env.ts: serverEnv()
    participant Loader as config-loader.ts: parseConfigFile()
    participant FS as config.yaml (CONSOLE_CONFIG or ./config.yaml)
    participant Build as env.ts: buildConsoleEnv()

    Route->>Env: serverEnv()
    alt already cached this process
        Env-->>Route: cachedConsoleEnv
    else first call
        Env->>Loader: parseConfigFile()
        Loader->>FS: readFileSync(resolve(cwd, CONSOLE_CONFIG or './config.yaml'))
        FS-->>Loader: raw YAML text (or throw: file not found)
        Loader->>Loader: parseYaml(text) → raw (or throw: invalid YAML)
        Loader->>Loader: resolveConfigEnv(raw) → resolved<br/>({env:VAR} → process.env[VAR] | undefined | '')
        Loader-->>Env: { raw, resolved, absolutePath }
        Env->>Build: buildConsoleEnv(parsed)
        Build->>Build: requiredField() × 4<br/>(session.secret, keycloak.issuer, keycloak.clientId, backendUrl)
        Build->>Build: validate session.secret length ≥ 32
        Build->>Build: apply defaults (scopes, apiBasePath, budgetUrl, rolesClaim, audienceRequired)
        Build-->>Env: ConsoleEnv
        Env->>Env: cachedConsoleEnv = ConsoleEnv
        Env-->>Route: ConsoleEnv
    end
```

## Startup outcomes

```mermaid
stateDiagram-v2
    [*] --> ReadingFile
    ReadingFile --> ParsingYaml: file found
    ReadingFile --> MissingFileFailure: ENOENT / read error
    ParsingYaml --> ResolvingEnv: valid YAML
    ParsingYaml --> InvalidYamlFailure: parse error
    ResolvingEnv --> Validating: {env:VAR} placeholders resolved
    Validating --> Cached: all 4 required fields present<br/>+ session.secret ≥ 32 chars
    Validating --> MissingRequiredFailure: required field unresolved<br/>(e.g. SESSION_SECRET unset)
    Validating --> BadUrlFailure: publicBaseUrl / issuer / backendUrl<br/>not a valid absolute URL*
    Cached --> [*]: ConsoleEnv served to every caller<br/>this process, no re-read
    MissingFileFailure --> [*]: throw, names absolutePath + CONSOLE_CONFIG
    InvalidYamlFailure --> [*]: throw, names absolutePath
    MissingRequiredFailure --> [*]: throw, names config key + env var
    BadUrlFailure --> [*]: throw, downstream (OIDC discovery /<br/>fetch()) at first use, not at parse time
```

\* `env.ts` itself does not URL-validate `keycloak.issuer`/`backendUrl`/`publicBaseUrl` — a
malformed value is only caught the first time something actually uses it as a URL (OIDC discovery,
`fetch()` in the proxy layer, `new URL()` in `publicOrigin()`), not at config-load time. Listed
here as a real, reachable startup-adjacent failure mode, not a state `env.ts` itself enforces.

---

## The other two documents on the same volume

`config.yaml` is not the only file the console reads from `${CONSOLE_CONFIG_DIR}`. Two more are
resolved from the same mount, both added by ADR 0015 and both documented in
`apps/console/README.md` rather than here, since neither is a config _schema_:

| File                                          | Purpose                                                   | Absent means                                       |
| --------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `${CONSOLE_CONFIG_DIR}/dashboards.yaml`       | Operator override of the declarative dashboard definition | the in-repo `apps/console/dashboards.yaml` is read |
| `${CONSOLE_TEMPLATES_DIR}/<route>/report.typ` | Operator override of one route's Typst report template    | the shipped template, else `_lib/default.typ`      |

**`CONSOLE_CONFIG_DIR` is derived, not a second independently-wired variable**: an explicit
`CONSOLE_CONFIG_DIR`, else the directory holding `CONSOLE_CONFIG`, else none — so a dev checkout
with no `CONSOLE_CONFIG` has no override root and does not treat the repo root as one. That is why
adding the dashboards override to `charts/converse-console` needed one more optional ConfigMap and
no new env var. `CONSOLE_TEMPLATES_DIR` **is** its own variable and is always set on the container,
which is only safe because template lookup is per **file**: a ConfigMap carrying one template
overrides exactly one report, and an absent directory overrides nothing.

`dashboards.yaml` shares `config.yaml`'s startup contract — validated on first read, cached for the
process lifetime, and **fail-loud**: an override that exists but is invalid throws (naming the
offending page route and panel id) rather than silently falling back to the shipped file.

---

## Cross-references

- `apps/console/README.md` — quickstart, the `dashboards.yaml` schema, and the report-template
  contract; also the pointer to this document.
- `auth-and-identity.md` — what `keycloak.*` and `session.secret` feed into (OIDC flow, session
  cookie crypto, audience validation, role claim).
- `rpc-and-codegen.md` — what `backendUrl`/`apiBasePath`/`budgetUrl`/`usageUrl` feed into (the
  byte-forwarding proxy layer).
