# Development Setup — converse-frontends

> Verified against `main@c9b4aa6` (2026-08-31) by reading the root and per-package `package.json`
> scripts, `compose.yml`, and `apps/console/config.yaml`. The previous version of this file
> described the deleted Expo app (`pnpm ios`/`pnpm android`, `EXPO_PUBLIC_*` config, an
> `expo export` build, and a Playwright test suite that has never existed here).

---

## Prerequisites

| Tool    | Version    | Notes                                                                                |
| ------- | ---------- | ------------------------------------------------------------------------------------ |
| Node.js | **22.x**   | What CI uses and what the console's runtime image is built on                        |
| pnpm    | **11.5.2** | Pinned by `packageManager` in the root `package.json`; get it with `corepack enable` |
| Docker  | 24+        | Only for the local Keycloak/WireMock stack                                           |
| Git     | 2.40+      | —                                                                                    |

No global framework CLI is needed: Next.js, Vite and the codegen tools are all workspace
dependencies.

---

## First run

```bash
git clone https://github.com/adorsys-gis/converse-frontends.git
cd converse-frontends
corepack enable
pnpm install
```

`pnpm install` runs `postinstall` → `codegen:all`, which regenerates **both** generated clients:
`@lightbridge/api-rest` from `openapi/usage.backend.yaml`, and `@lightbridge/authz-rpc` from
`packages/authz-rpc/schema/authz.cstack`. Both outputs are gitignored build artifacts and must
generate successfully before anything will build.

> `@cratestack/cli`'s own postinstall downloads a matching Rust binary from GitHub Releases, so the
> first install needs network access to `github.com`. It is allowlisted under `allowBuilds` in
> `pnpm-workspace.yaml`; pnpm does not run dependency build scripts otherwise.

---

## Running things

| What                        | Command                                | URL                       |
| --------------------------- | -------------------------------------- | ------------------------- |
| Console (Next.js)           | `pnpm --filter console dev`            | http://localhost:3000     |
| Console over HTTPS          | `pnpm --filter console dev:https`      | https://localhost:3000    |
| authz-ui (Vite SPA)         | `pnpm --filter authz-ui dev`           | http://localhost:5173/ui/ |
| governance-auth (Vite page) | `pnpm --filter governance-auth dev`    | http://localhost:5174     |
| Storybook (`ui-web`)        | `pnpm --dir packages/ui-web storybook` | http://localhost:6007     |

**authz-ui's dev server serves at `/ui/`** because the app is built with Vite `base: '/ui/'` to match
where `authz-idp` mounts it; Vite redirects `/` there for you. Note that `vite dev` has **no route
allowlist** — in production `authz-idp` serves only the routes published in `dist/routes.json`, so a
route that works in dev can still 404 in production if it was not added to
`src/routes/route-table.ts`. See `apps/authz-ui/README.md`.

**governance-auth's dev server runs on port 5174** (with `--strictPort`) so it does not collide with
authz-ui's `vite dev` on 5173. It is the one app where `vite dev` is only for visual iteration: the
artifact that matters is the single self-contained `dist/index.html` that
`lightbridge-governance` embeds. See `apps/governance-auth/README.md`.

### Local backing services

```bash
docker compose up -d
```

| Service       | Image                              | Port  | Purpose                                                          |
| ------------- | ---------------------------------- | ----- | ---------------------------------------------------------------- |
| `keycloak-26` | `quay.io/keycloak/keycloak:26.4.0` | 13444 | OIDC provider; imports its realm from `.docker/keycloak-config/` |
| `wiremock`    | `wiremock/wiremock:3.13.2`         | 18888 | Stubbed backend, so the console runs with no Rust/Postgres stack |

For the console against a **real** local `lightbridge-authz` stack instead of WireMock, point it at
`config.local-authz.yaml` (see below); that repo's `docs/local-testing.md` covers bringing the
backend up.

---

## Configuration (console)

The console is **YAML-first, not env-first**. `apps/console/config.yaml` is the primary document;
`{env:VAR}` placeholders in it are resolved at load time, and only secrets come from the
environment. Alternate documents ship for the two common local modes:
`config.wiremock.yaml` and `config.local-authz.yaml`.

| Variable            | Required | Purpose                                                           |
| ------------------- | -------- | ----------------------------------------------------------------- |
| `SESSION_SECRET`    | **yes**  | ≥32 chars; the session cookie's encryption key is derived from it |
| `IDP_CLIENT_SECRET` | no       | Only for a confidential Keycloak client                           |
| `CONSOLE_CONFIG`    | no       | Path to a different config document (e.g. `config.wiremock.yaml`) |

Start from `apps/console/.env.example`. Full key-by-key reference: `console-configuration.md`.
**There are no `NEXT_PUBLIC_*` variables** — no backend URL or secret ever reaches the browser
(ADR 0009 D3).

`apps/authz-ui` needs no configuration at all: it is a static bundle with no server and no runtime
config. `apps/governance-auth` likewise: a static page, no server, no runtime config (its only
"input" is the single `data-callback-status` attribute `lightbridge-governance` swaps in after
embedding it).

---

## Quality gates

```bash
pnpm test          # every workspace's vitest suite
pnpm build         # turbo run build:web — all three apps
pnpm lint          # eslint + prettier --check, repo-wide
pnpm format        # eslint --fix + prettier --write
```

Per-workspace: `pnpm --filter <name> test` / `typecheck` / `build:web`.

`pnpm --filter authz-ui build:web` also runs three verifier scripts that fail the build:
service-worker scope, CSS/CSP compliance, and the routes manifest. They are gates, not
formalities — read the error before working around one.

> **Known state of `pnpm lint`:** it reports pre-existing findings on `main` (ESLint errors plus a
> large Prettier drift), and no CI job runs it — so the gate is currently dead. Capture the count
> before your change and compare after, rather than assuming you broke something. `ci-cd.md` §3
> documents the measurement; issue
> [#412](https://github.com/ADORSYS-GIS/converse-frontends/issues/412) tracks restoring the gate.

---

## Building for production

```bash
pnpm --filter console build:web        # .next/standalone — the console's Node server bundle
pnpm --filter authz-ui build:web       # dist/ — static assets + routes.json
pnpm --filter governance-auth build:web  # dist/index.html — one self-contained HTTP callback page
```

Container images are built in CI, not from a root Dockerfile: `apps/console/Dockerfile` produces the
console's runtime image (glibc base — the CBOR native package publishes no musl build), and
`apps/authz-ui/Containerfile` produces an assets-only `FROM scratch` image that `lightbridge-authz`
pins by digest. `apps/governance-auth` ships **no image at all** — `governance-auth-callback-oci.yml`
publishes its single `dist/index.html` as an OCI artifact via `oras`, which
`lightbridge-governance`'s `scripts/vendor-callback-page.sh` consumes. Details and the deployment
matrix: `ci-cd.md`, `infrastructure.md`.

---

## Troubleshooting

| Symptom                                                                      | Cause / fix                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codegen fails on `pnpm install`                                              | No network to `github.com` (the cratestack CLI's binary download), or an invalid `openapi/usage.backend.yaml`                                                    |
| Console starts then 500s on any page                                         | `SESSION_SECRET` missing or under 32 characters                                                                                                                  |
| Keycloak login loops or rejects the redirect                                 | The redirect URI is not registered on the Keycloak client, or `idp.issuer` in the config document is unreachable from the browser                                |
| WireMock 404s a call the UI makes                                            | No matching stub in `wiremock/mappings/`; `docker compose restart wiremock` after adding one                                                                     |
| A new authz-ui route 404s in a real deployment but works in `vite dev`       | It was added to `app.tsx` without `route-table.ts`, so it never reached `dist/routes.json`                                                                       |
| An authz-ui style silently does nothing, or the browser logs a CSP violation | A daisyUI component class reached that surface; use the CSP-safe sections (`apps/authz-ui/README.md`)                                                            |
| Storybook shows a component but the console does not                         | The barrel export is missing, or the app imports a deep subpath that does not resolve — check all three resolution sites (tsconfig paths, bundler, Vitest alias) |
