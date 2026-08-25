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
    globals.css             one line: @import '@lightbridge/ui-web/styles.css'
    (console)/              the shelled route group — see "The shell is mounted once" below
      layout.tsx            'use client' — ConsoleShell + header + nav + account menu, ONCE
      page.tsx  api-keys/  manage/  admin/     the centre column per route
      @rail/                parallel-route slot: the right rail, per route
      @scope/               parallel-route slot: the left rail's secondary section, per route
    auth/login|callback|logout        route handlers — the whole OIDC lifecycle
    auth/signed-out|error             AuthScreen views — OUTSIDE the group, so no shell
    api/rpc|budget/rpc|usage          the byte-forwarding proxies
    api/session                       sanitized identity for the client shell (no tokens)
    .well-known/oauth-protected-resource   RFC 9728 metadata for MCP-style clients
  middleware.ts             app-route guard: no session cookie -> /auth/login?returnTo=…
  server/                   server-only: config loading, OIDC, session crypto, refresh policy, proxy
  client/                   'use client': refine root, cratestack clients, shell chrome, view state
  containers/               per-route `use-*-screen` adapters (refine hooks -> section props) and
                            the thin centre/rail components that compose ui-web sections from them
  sw.ts                     service worker (built by @serwist/next in production only)
config.yaml                 the primary server config document — see Configuration below
```

## The shell is mounted once

`packages/ui-web` exports **sections**, never full pages (console-ui skill § _Composition_). A
route composes sections; it never renders the shell. The shell lives in exactly one place —
`app/(console)/layout.tsx` — and every route in the group supplies three zones:

| Zone                          | Comes from                       |
| ----------------------------- | -------------------------------- |
| centre column                 | `children` (`<route>/page.tsx`)  |
| right rail                    | the `@rail` parallel-route slot  |
| left rail's secondary section | the `@scope` parallel-route slot |

Both slots carry a `default.tsx`, so a route with nothing to put in a rail renders without it
rather than 404-ing the segment.

The property this buys: **navigating does not remount the header or the nav**. That is a
regression-tested claim, in two halves —
`src/app/console-shell-mount.test.ts` asserts the route tree's shape (the shell is imported in
exactly one file; no `page.tsx` mounts any part of it; every centre route has a matching segment in
both slots; every `/admin` segment carries the server-side role gate), and
`packages/ui-web/src/pages-stories/shell-persistence.stories.tsx` asserts the runtime half by
object identity: stash the nav DOM node, navigate, and it is still the same node.

Data still flows the same way it always did: a per-route `use-*-screen` hook adapts refine/TanStack
hook state into section props. Centre and rail both call it, issue the same query key, and are
served from one request by the query cache.

## View state is the URL

Because the centre and the two rails are separate route segments in separate React subtrees, any
state they share has to live **above all three**. The query string already does
([ADR 0011](../../docs/adr/0011-url-first-state-nuqs.md)), so the layout-level providers that used
to hold it — `ConsoleScopeProvider`, `ConsoleViewStateProviders` — are **deleted, not wrapped**.
Every zone calls the same hook and reads the same params.

`src/client/url-state.ts` is the **only** module allowed to declare a query param. It holds the
whole contract as typed nuqs parsers with defaults:

| Route       | Params (URL names)                                                                          |
| ----------- | ------------------------------------------------------------------------------------------- |
| all         | `account`, `project`, `sheet`                                                               |
| `/`         | `range`, `bucket`, `group-by`, `model`, `series`                                            |
| `/api-keys` | `page`, `status`, `q`, `key`, `revoke`                                                      |
| `/manage`   | `page`, `q`, `status`, `budget-state`, `row`, `period`, `report-group`, `format`, `include` |
| `/admin`    | `tab`, `request`                                                                            |

Three rules the table obeys, all enforced in that one module: **defaults stay out of the URL**
(nuqs `clearOnDefault`), **knobs write with `history: 'replace'` and navigation-grade params
(scope, selections, the active tab) write with `history: 'push'`** — which is what makes Back mean
"undo that selection" instead of "leave the page" — and **free-text search is debounced onto the
URL** while its input stays instant.

`nuqs`' App Router adapter is mounted in `src/app/layout.tsx`, outside `Providers` (it is not
`ssr: false`, so the query string is readable during the server render too). refine's
`syncWithLocation` stays **off**: one URL writer, and the flow runs strictly URL → `use-*-screen`
→ refine hook params.

Three things deliberately stay out of the URL: the theme preference (a shared link must not
restyle the app for its recipient — ADR 0011 Decision 6), one-time API-key secrets and reviewer
decision notes, and mutation outcomes. The last two travel through the shared `MutationCache`
instead (`src/client/use-shared-mutation.ts`), which is what lets a `+ New key` pressed in the
rail reveal its secret in the centre. `useState` survives in exactly three places in `src/`, each
carrying the one-line justification ADR 0011 Decision 3 requires: the command palette's open flag,
the auth doorway's pre-redirect status, and the reviewer's unsent decision note.

## Configuration

Server configuration is **YAML-first**, matching `lightbridge-authz`'s `config/default.yaml`
shape: `config.yaml` (checked in, at the app root) is the primary config document — session,
Keycloak/OIDC, backends, and public origin all live there; `.env`/`.env.local` supply only the
environment variables it references (`SESSION_SECRET`, optionally `KEYCLOAK_CLIENT_SECRET`, plus
the `CONSOLE_CONFIG` path override — see `.env.example`).

**Full reference** — the key-by-key schema (types/required/defaults), the exact `{env:VAR}`
interpolation rules and how they diverge from `lightbridge-authz`'s `${VAR}` syntax, `CONSOLE_CONFIG`,
the `config.wiremock.yaml` variant, and a worked example:
[`docs/knowledge/console-configuration.md`](../../docs/knowledge/console-configuration.md).

Quickstart:

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

### Dev without a backend: wiremock

`config.yaml`'s default `backendUrl: 'http://localhost:13000'` assumes a real `lightbridge-authz`
checkout running alongside this repo. Without one, every data call fails at the proxy layer with
`502 {"error":"upstream_unreachable"}` (`src/server/proxy.ts`'s `forward()` catch — the `fetch()` to
`backendUrl` itself throws, ECONNREFUSED).

The repo's own `compose.yml` ships a `wiremock` service (port 18888) stubbing the ops every console
screen calls, with a handful of accounts/projects/keys/refill requests — enough to click through
`/`, `/manage`, `/api-keys` and `/admin` end to end:

```bash
docker compose up -d wiremock                # from the repo root — http://localhost:18888
```

Then point the console at it instead of the real stack via `CONSOLE_CONFIG=./config.wiremock.yaml`
— see [`docs/knowledge/console-configuration.md`](../../docs/knowledge/console-configuration.md)
for what that file changes and why:

```bash
CONSOLE_CONFIG=./config.wiremock.yaml pnpm --filter console dev
# or export it once: CONSOLE_CONFIG=./config.wiremock.yaml — see .env/.env.example
```

Two things had to change to make this work, both dev-only (production still speaks CBOR through a
batch link — see `src/client/rpc-clients.ts`'s doc comment):

- **Codec**: the console client now builds with `defaultCodec()` (`@lightbridge/authz-rpc`) instead
  of a hardcoded `CborCodec` — JSON in `next dev`, CBOR in a production build, the same split every
  other app in this repo already uses. WireMock stubs plain JSON; hand-authoring CBOR fixtures (as
  base64 `__files`) was the fallback considered and rejected as more moving parts for no benefit.
- **Batching**: the batch link (`createBatchLink()`, which collapses every call into one `POST
/rpc/batch`) is dev-disabled, so each op hits `POST /rpc/{op_id}` directly. Stubbing the batch
  envelope's `[{id, op, input}] -> [...]` frame shape in WireMock was the alternative — rejected for
  the same reason: `wiremock/mappings/` already had plain per-op stubs (from an earlier PR, for
  `apps/self-service`), so keeping calls unbatched reuses them instead of adding a second stubbing
  strategy for the same ops.

What's stubbed: `accounts`/`projects`/`apiKeys` list/get + the mutation procedures
(`wiremock/mappings/mapping.json`), and the `/admin` refill queue's three budget procedures —
`listPendingAugmentationRequests`, `approveAugmentationRequest`, `rejectAugmentationRequest`
(`wiremock/mappings/console-budget.json`, mounted under the fixed `/budget` prefix). Not stubbed:
`/api/usage/*` — the Overview's usage/budget dashboards have no query client wired up yet (see
"Known gaps" below), so there is nothing to stub against. An op with no mapping answers WireMock's
default 404 HTML page rather than a crafted JSON error — acceptable for a dev stub, not something a
real client should parse.

Verified directly against WireMock (`curl -X POST http://localhost:18888/rpc/model.Account.list
-d '{}'`, etc. — every mapping above returns its fixture) and against the proxy unauthenticated
(`curl http://localhost:3000/api/rpc/model.Account.list` answers `401
{"error":"unauthenticated"}`, proving the proxy's session gate runs before it ever reaches
`BACKEND_URL`). Seeing the stubbed data rendered in an actual screen needs a real, logged-in
browser session (Keycloak cookie) — `curl` alone can't drive the OIDC login flow.

## Scripts

| Script                            | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `pnpm --filter console dev`       | `next dev --turbopack` on :3000                                  |
| `pnpm --filter console build:web` | `next build --webpack` — the task `turbo run build:web` picks up |
| `pnpm --filter console start`     | serve the production build                                       |
| `pnpm --filter console test`      | vitest (node environment; server logic + row adapters)           |
| `pnpm --filter console typecheck` | `tsc --noEmit`                                                   |

### Turbopack in dev, webpack for the build

Two different bundlers on purpose, one reason each.

**The production build stays on webpack** because `@serwist/next` — the stable Serwist integration,
and the only thing that compiles `src/sw.ts` into `public/sw.js` — is a webpack plugin. Turbopack
never calls a `next.config.mjs` `webpack()` function at all, so under Turbopack the service worker
would simply never be built. In development that costs nothing: ADR 0009 Decision 7 disables the
service worker there anyway (`disable: process.env.NODE_ENV !== 'production'`), so `withSerwist` is
already a no-op under `next dev`.

**Dev moved to Turbopack** once the one thing pinning it to webpack was fixed at the source.
`packages/authz-rpc/generated/` is emitted by `cratestack generate-typescript` as ESM TypeScript
using NodeNext `.js` import specifiers (`./runtime.js` for `runtime.ts`). `tsc`, vitest, Metro and
webpack all resolve that — webpack did so through `experimental.extensionAlias`, which used to live
in `next.config.mjs`. Turbopack has no equivalent: neither `turbopack.resolveExtensions` nor
`turbopack.resolveAlias` (`{'*.js': ['*.ts', '*.js']}`) maps the specifier onto the `.ts` source,
re-verified against Next 16.3.2. The fix now lives in the generator's own output —
`packages/authz-rpc/scripts/normalize-generated-specifiers.mjs` runs as the second half of that
package's `codegen` script and strips the extension from its 23 relative specifiers, which every
consumer resolves (the generated tree compiles under `moduleResolution: "Bundler"`, where the
extension is optional). `experimental.extensionAlias` is gone; nothing else in the repo emits
NodeNext-style relative specifiers. That script is a stopgap for a cratestack emit option — see its
header.

Measured on the branch that made the switch — medians of 3 cold runs each, interleaved, same
machine (macOS/M-series). A "cold run" deletes `.next` first; "edit → built" times a real source
change from `writeFile` until the rebuilt module is on disk and servable.

| Metric                                   |  webpack | Turbopack | delta |
| ---------------------------------------- | -------: | --------: | ----: |
| cold boot → Ready                        |   563 ms |    513 ms |   -9% |
| first compile `/auth/login`              |  2186 ms |    696 ms |  -68% |
| first compile `/`                        |  6366 ms |   1856 ms |  -71% |
| first compile `/manage`                  |  1998 ms |    438 ms |  -78% |
| all three first compiles                 | 10600 ms |   3000 ms |  -72% |
| edit an `apps/console` container → built |   200 ms |     71 ms |  -65% |
| edit a `packages/ui-web` section → built |   199 ms |     73 ms |  -63% |
| warm restart → Ready                     |   614 ms |    562 ms |   -8% |
| first `/manage` after a warm restart     |  5223 ms |   2503 ms |  -52% |
| full `/manage` load (HTML + every asset) |   250 ms |     58 ms |  -77% |
| dev JS+CSS served per `/manage` load     | 13.6 MiB |  9.09 MiB |  -33% |
| `.next/` on disk after the run           |  121 MiB |    55 MiB |  -55% |

Two numbers moved the wrong way and are reported as-is: warm TTFB for `/` goes 22 ms → 30 ms (an
already-compiled route re-rendering; +8 ms), and a `/manage` page load fetches 32 asset requests
instead of 5, because Turbopack emits many small chunks rather than one large `main-app.js`. Neither
is felt against a 4.5-second saving on the first compile.

**Where the time actually went**, from a webpack build instrumented with a `succeedModule` timer
(the profiling harness is not committed): on a cold `/`, the `next-flight-client-module-loader +
next-swc-loader` pair accounted for **17.5 s of the 18.9 s** of server-compilation loader time
summed across workers, and 9.6 s of 14.0 s on the client — i.e. SWC transpiling ~1480 server and
~1190 client modules. The module graph is dominated by `next` (416), `lodash-es` (154, pulled in by
`@refinedev/core`), `@base-ui/react` (133) and the `d3-*` family (~170); by transpile time it is
`@base-ui/react` (4.1 s), `next` (3.4 s) and `d3-array`/`d3-shape` (3.2 s). That is real work on a
real dependency graph, not a misconfiguration — which is why the win came from changing what does
the transpiling rather than from trimming imports.

Ruled out along the way, each measured rather than assumed:

- **The generated cratestack client is not a factor.** 12 files, 2744 lines, 128 KB, and it does not
  reach the top 14 packages by module count in any compilation. The console already imports it
  granularly — `@lightbridge/authz-rpc/refine` is a single re-export of `generated/src/refine.ts`,
  deliberately off the package barrel.
- **Serwist is already fully dev-disabled** (below), and under Turbopack it cannot run at all.
- **`theme.css`'s `@source '.'` does not over-scan.** It resolves to `packages/ui-web/src` (the file
  lives in `src/`), not the package root — 364 files. The whole CSS loader chain cost 810 ms + 486 ms
  on a cold client compile, ~9% of that compilation's loader time.
- **The `@fontsource` imports are 44 modules total** (30 + 14), under 1 s of transpile time.
- **The persistent client-component layout is not the problem it looks like.** Editing a route's own
  container rebuilds in 71 ms; the shell-mounted-once split already keeps route changes off the
  shell.

#### The `browserslist` block is load-bearing, and it is dev-only

`package.json` carries a `browserslist` with separate `production` and `development` lists. The
`production` list is a verbatim copy of Next 16's own default target
(`next/dist/shared/lib/modern-browserslist-target.js`: `chrome 111`, `edge 111`, `firefox 111`,
`safari 16.4`), so the production build compiles to exactly what it compiled to before this file
existed. The `development` list differs in one entry — `firefox 121` instead of `firefox 111` — and
that single bump is what keeps the theme correct under Turbopack.

Why: Turbopack re-emits every stylesheet through Lightning CSS, targeted from browserslist. Firefox
111 predates native `:has()`, so Lightning CSS downlevels daisyUI's theme selectors, folding
`:root:has(input.theme-controller[value=black]:checked), [data-theme=black]` into
`:is(:root:has(…), [data-theme=black])`. `:is()` takes the specificity of its _most_ specific
argument, so the stock daisy `black` block jumps to (0,4,1) while our customized block — which
carries a `:where(:root)` branch and is therefore split rather than merged — stays at (0,1,0) on its
`[data-theme]` selector and loses the cascade. The visible symptom is the entire accent system
reverting to daisy's stock achromatic grey: `--color-primary` resolves to `lab(24.6% 0 0)` instead
of `#da5c2c`. Firefox 121 has `:has()`, Lightning CSS leaves the selector lists alone, and both
themes resolve correctly again (verified in a browser against `--color-primary`, `--color-ink`,
`--color-muted`, `--chart-rank-1` and `--radius-field`, in `black` and `wireframe`). The webpack
pipeline never had the problem — it does not run Lightning CSS over the Tailwind output at all.

### Other dev-speed notes

- **Serwist is already fully dev-disabled** (`disable: process.env.NODE_ENV !== 'production'` in
  `next.config.mjs`) — confirmed by reading `@serwist/next`'s own webpack plugin: with `disable`
  true it returns the untouched webpack config immediately, before any of its precache-manifest or
  service-worker-bundling work runs.
- **The refine/query-client provider tree is already lazy**: `src/client/providers.tsx` mounts
  `ConsoleProviders` via `next/dynamic({ ssr: false })`, not a static import.
- **Every `ui-web` value import goes through its own `@lightbridge/ui-web/src/*` subpath**, not the
  package barrel (`@lightbridge/ui-web`'s `src/index.ts`) — the shell chrome, every section, every
  primitive. See `src/client/console-chrome.tsx`'s doc comment. Next's dev webpack build doesn't
  tree-shake unused re-exports, so importing anything from the barrel pulled the
  `d3-scale`/`d3-shape`/`d3-array`-backed chart components (only the Overview route renders them)
  into every route's dev bundle — confirmed by grepping the compiled
  `.next/dev/server/app/manage/page.js` for `SpendSeriesChart` before/after that change (present,
  then gone; `/`'s bundle still legitimately contains it). This matters more now, not less: the
  shell's layout chunk is loaded by every route, so a barrel import there would be the worst place
  of all for it. Type-only imports stay on the barrel — they erase at compile time.
  `@lightbridge/ui-web`'s `package.json` already publishes a `"./src/*"` subpath export for this;
  `tsconfig.json` needed a matching `tsc`-only `paths` shim for the same reason. (A second such
  shim used to live here too, for the DOM-free chart math package's deep imports — removed once
  that package, `packages/chart-core`, was extracted and every importer switched to its package
  barrel instead of a deep path.)

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
