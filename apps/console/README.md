# apps/console

The Lightbridge console: a Next.js (App Router) web application that replaces the Expo
self-service app. Source of truth for every decision below:
[ADR 0009](../../docs/adr/0009-nextjs-console-replacement.md).

This scaffold covers the auth seam, the proxy layer, refine wiring, the mobile-first shell and the
offline-first foundations. The remaining screens and the report-export route are separate PRs (the
ADR's own follow-up list).

## Shape

```
src/
  app/                      App Router
    layout.tsx              server component — reads the session cookie, seeds the client shell
    page.tsx                / -> OverviewPage
    api-keys/  manage/      screens over ui-web page views
    admin/                  server-gated on the `lightbridge-admin` role (404 otherwise)
    auth/login|callback|logout        route handlers — the whole OIDC lifecycle
    auth/signed-out|error             AuthPage views
    api/rpc|budget/rpc|usage          the byte-forwarding proxies
    api/session                       sanitized identity for the client shell (no tokens)
    .well-known/oauth-protected-resource   RFC 9728 metadata for MCP-style clients
  middleware.ts             app-route guard: no session cookie -> /auth/login?returnTo=…
  server/                   server-only: config loading, OIDC, session crypto, refresh policy, proxy
  client/                   'use client': refine root, cratestack clients, shell chrome
  containers/               thin adapters from refine hook state to pure page-view props
  sw.ts                     service worker (built by @serwist/next in production only)
config.yaml                 the primary server config document — see Configuration below
```

## Configuration

Server configuration is **YAML-first**, matching `lightbridge-authz`'s `config/default.yaml`
shape: `config.yaml` (checked in, at the app root) is the primary config document — session,
Keycloak/OIDC (issuer, client, scopes, audiences), backends, and public origin all live there.
Inside it, a value may reference a `{env:SOME_ENV}` placeholder that resolves to the matching
environment variable at load time (`src/server/config-loader.ts`; loaded and validated once per
process by `src/server/env.ts`'s `serverEnv()`).

Only genuine secrets are placeholders — `session.secret` always is, `keycloak.clientSecret`
optionally is (only a confidential client needs one). Everything else that has a safe local-dev
value (issuer URL, backend URLs, audiences, ...) is a plain literal directly in `config.yaml`; a
real deployment that needs different literals ships its own `config.yaml` and points the
`CONSOLE_CONFIG` env var at it, rather than overriding individual fields through the environment.

`.env`/`.env.local` therefore now supply **only** the environment variables `config.yaml`
references — `SESSION_SECRET` (required) and `KEYCLOAK_CLIENT_SECRET` (optional). `.env.example`
documents both, plus `CONSOLE_CONFIG` itself.

**Divergence from `lightbridge-authz`'s syntax** (documented in full in
`config-loader.ts`'s header comment): authz supports `$VAR`, `${VAR}`, `${VAR-default}`, and
`${VAR:-default}`, and a bare unset `$VAR`/`${VAR}` silently resolves to an empty string. This
loader supports only `{env:VAR}` — no inline default operator — and when a placeholder is the
_entire_ value of a YAML scalar, an unset/empty variable resolves to `undefined` rather than `""`,
so a required field (`session.secret`, `keycloak.issuer`, `keycloak.clientId`, `backendUrl`) fails
fast at startup naming both the config key and the missing variable, instead of starting
successfully on a blank value and breaking downstream. A placeholder embedded inside a larger
string still falls back to `''` when unset — there's no sensible way to represent "half of a
string is undefined".

```bash
# 1. Keycloak (realm `lightbridge-dev`, client `self-service`, imported from
#    .docker/keycloak-config/) — from the repo root:
docker compose up -d keycloak-26          # http://localhost:13444

# 2. authz-api + authz-budget: `docker compose up` in the lightbridge-authz repo
#    (http://localhost:13000 and http://localhost:13005)

# 3. The console:
pnpm install
pnpm --filter console dev                 # http://localhost:3000
```

### No manual Keycloak step

The imported dev realm's `self-service` client allows both the Expo app's
`http://localhost:8081/*` and the console's `http://localhost:3000/*` as redirect and post-logout
redirect URIs (`.docker/keycloak-config/realm.theme.vymalo-wh-01.json`) — `docker compose up -d
keycloak-26` is all the auth setup local dev needs. Verified against a real Keycloak 26.4.0:
unauthenticated `/` redirects through `/auth/login` to the realm's authorize endpoint with PKCE
S256, and Keycloak accepts the client + redirect URI and renders its login page.

The dev realm's client also carries an `oidc-audience-mapper` (`converse-frontend-audience` in
`.docker/keycloak-config/realm.theme.vymalo-wh-01.json`) that mints `aud: converse-frontend` on
every access token, so `config.yaml` ships `expectedAudiences: [converse-frontend]` and
`audienceRequired: true` — the same audience check a real deployment exercises, not a skipped one.

The alternative dev realm the Expo app's `.env` points at
(`http://localhost:9100/realms/dev`, client `test-client`, audiences
`lightbridge-api-key,converse-frontend,lightbridge-token-issuer`) works too: point
`keycloak.issuer`/`keycloak.clientId` in `config.yaml` at it and restore the audience values.

## Scripts

| Script                            | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `pnpm --filter console dev`       | `next dev --webpack` on :3000                                    |
| `pnpm --filter console build:web` | `next build --webpack` — the task `turbo run build:web` picks up |
| `pnpm --filter console start`     | serve the production build                                       |
| `pnpm --filter console test`      | vitest (node environment; server logic + row adapters)           |
| `pnpm --filter console typecheck` | `tsc --noEmit`                                                   |

### Why `--webpack` and not Turbopack

Two independent reasons, both in `next.config.mjs`'s header comment:

1. `packages/authz-rpc/generated/` is emitted by `cratestack generate-typescript` as ESM TypeScript
   using NodeNext `.js` import specifiers (`./runtime.js` for `runtime.ts`). Turbopack has no
   equivalent of webpack's `resolve.extensionAlias` and fails to resolve them; the files are
   generated, so the imports cannot be fixed at the source.
2. `@serwist/next`, the stable Serwist integration, is a webpack plugin.

## Auth model (ADR 0009 Decision 2)

The browser never holds a token.

```
GET /manage  ──(no cookie)──▶ middleware ──302──▶ /auth/login
/auth/login   builds the PKCE authorize URL server-side; state + code_verifier go into a
              sealed, httpOnly, 10-minute cookie
/auth/callback  exchanges the code server-side, validates `aud`, writes the session cookie
/api/*        attaches `Authorization: Bearer` from the decrypted session and refreshes
              server-side; rotates the cookie on the same response
/auth/logout  RP-initiated end_session with id_token_hint, then clears the cookie
```

- **Session cookie**: JWE (`dir` + `A256GCM`, key = HKDF of `SESSION_SECRET`), `httpOnly`,
  `Secure`, `SameSite=Lax`. Chunked across `lb_console_session.0..N` because three Keycloak JWTs
  exceed a browser's ~4096-byte per-cookie cap.
- **Audience validation** runs on login _and_ on every refresh, and blocks on a mismatch — the same
  rule `packages/hooks/src/auth/use-keycloak-login.ts` enforces today.
- **Refresh** mirrors `packages/authz-rpc/src/runtime.ts` exactly: proactive when
  `expiresAt - now <= 60s`, reactive retry-once on an upstream `401`, per-session de-dup, 60s
  cooldown after a failure. On failure the cookie is cleared and the proxy answers
  `401 {"error":"session_expired"}`.
- **Roles** come from the `lightbridge_api_roles` claim (`ROLES_CLAIM`), merged with Keycloak's
  `realm_access` / `resource_access` roles. UI gating only — `lightbridge-authz` enforces every
  permission server-side (`packages/hooks/src/rbac.ts`).

## Proxy model (ADR 0009 Decisions 3 and 7)

The console is the only exposed origin. `/api/rpc/*`, `/api/budget/rpc/*` and `/api/usage/*` forward
raw request bytes upstream and stream the response back — **never decoding the payload**, so the
CBOR wire format (and its `stripUndefined` `Option<T>` gotcha) stays entirely a client concern.

Request headers are forwarded through an allow-list, so the browser's own `Cookie` and any
client-supplied `Authorization` can never reach a backend. Path segments are validated against
`[A-Za-z0-9_.-]+` (no `.`/`..`), so no request can climb out of the configured base path.

The request body is buffered rather than streamed, because the reactive-401 path has to replay the
exact same bytes with a fresh token. Responses are streamed.

## Offline-first

- **Service worker** via `@serwist/next`: precached app shell plus Next-aware runtime caching.
  Registered **only in a production build**. Nothing under `/api/*` is cached — every proxy response
  is `no-store`, and caching an authenticated response into an origin-scoped store would outlive the
  session that authorised it.
- **Query cache** persisted to IndexedDB (`idb-keyval` + `@tanstack/react-query-persist-client`),
  24h max age, busted on the app version. Previously-loaded screens render from cache with an inline
  `offline · showing cached data` status line in the header. Mutations require connectivity — no
  offline mutation queue (ADR 0009 Decision 7, explicitly).

## Known gaps in this scaffold

Each is visible in the UI as an inline status line, never a fake number:

- **Usage dashboards** (spend, latency) and the **budget hero** on `/` have no query client yet;
  `packages/api-rest` still has zero importers. Project and API-key counts are live.
- **Report export** on `/manage` states that `/api/reports/consumption` (ADR 0009 Decision 8) is not
  wired.
- **Project creation** has no form yet.
- The `/api-keys` "New key" action creates a key with a generated name and a 90-day expiry; the
  parameter form is a follow-up.
- `src/middleware.ts` uses the file convention Next 16 deprecated in favour of `proxy`. Renaming it
  is a follow-up rather than a silent side effect of this PR.
