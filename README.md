# Converse Frontends

Frontend monorepo for Lightbridge/GIS's self-service console: a Next.js web application, its
shared DOM component package, and the generated RPC/REST clients it talks through.

## Why This Project

This repository exists to:

- ship the Lightbridge self-service console (account/project/API-key/budget management, usage
  reporting) as a server-rendered Next.js app
- keep UI, RPC access, auth, and translations consistent in one monorepo
- separate concerns clearly:
  - routing, server auth, and data orchestration in `apps/console`
  - reusable DOM UI primitives in `packages/ui-web`
  - chart math (scales, bins, colour ramps) in `packages/chart-core`
  - generated RPC client in `packages/authz-rpc`
  - generated REST client (usage backend) in `packages/api-rest`
  - translations in `packages/i18n`
- support runtime configuration per environment (no rebuild needed)

## Tech Stack

- Next.js (App Router) + React 19, Node runtime
- Tailwind v4 + daisyUI + Base UI + cmdk + Floating UI (see ADR 0010)
- refine.dev for CRUD scaffolding against cratestack-generated RPC resources
- TanStack Query
- Cookie-based sessions, server-side OIDC against Keycloak (see ADR 0009 Decision 2)
- PNPM workspaces monorepo, Turborepo task orchestration

## Repository Layout

```text
apps/
  console/             # Next.js console (routes, server auth, containers)
packages/
  ui-web/              # DOM UI primitives + screen sections
  chart-core/          # DOM-free chart math (scales, bins, colour ramp)
  authz-rpc/           # Generated RPC client (cratestack)
  api-rest/            # Generated REST client (usage backend, Hey API)
  hooks/               # Query/service hooks
  api-native/          # Native-capability wrappers (currently unused by apps/console)
  i18n/                # i18n provider + resources
openapi/
  usage.backend.yaml   # OpenAPI source for api-rest codegen
packages/authz-rpc/schema/
  authz.cstack          # cratestack schema source for authz-rpc codegen
.github/workflows/
  docker-image.yml     # Build + push apps/console's container to GHCR
apps/console/Dockerfile # Production Next.js image build
compose.yml            # Local Keycloak + wiremock helpers
```

> `apps/self-service` (the previous Expo/React Native app) and `packages/ui` (its UI package) were
> removed in a hard cutover — see ADR 0009 and ADR 0010 §3c for the decision and status.

## Prerequisites

- Node.js 22+
- PNPM (via Corepack recommended)
- Docker (for the local Keycloak/wiremock compose stack, and for container builds)

## Install

```bash
corepack enable
pnpm install
```

## Run Locally

### 1) Prepare environment variables (dev)

Copy `apps/console/.env.example` to `apps/console/.env.local` (or export in shell) and fill in
your values — see `docs/knowledge/console-configuration.md` for the full variable reference.

### 2) Optional: start local Keycloak + wiremock

```bash
docker compose up keycloak-26 wiremock
```

Keycloak runs on `http://localhost:13444`; wiremock on `http://localhost:18888`.

### 3) Start the console

```bash
pnpm --dir apps/console dev
```

## How To Test

```bash
pnpm test           # every workspace's vitest suite
pnpm exec tsc --noEmit -p apps/console/tsconfig.json   # (typecheck; see .github/workflows/test.yml for the full-workspace loop)
pnpm lint
```

## AI Governance

This repository follows the [ADORSYS-GIS AI Governance](https://adorsys-gis.github.io/ai-governance/) kit for issues, pull requests, and AI-assisted work.

- Use the structured GitHub issue forms for epics, user stories, and development tickets.
- Use the pull request template and include AI usage, source-of-truth, and verification evidence.
- The `AI Governance` workflow enforces the required PR body sections.
- OpenCode review is wired through the reusable governance workflow and runs only when `OPENCODE_GATEWAY_AUDIENCE` is configured.

Repo-specific integration details are documented in [docs/ai-governance.md](docs/ai-governance.md).

## Production Container

`apps/console/Dockerfile` builds a Node-runtime production image (standalone Next.js bundle) —
see `.github/workflows/docker-image.yml` for the build/publish pipeline (Buildah, GHCR).

```bash
pnpm --filter console build:web
buildah build -f apps/console/Dockerfile -t converse-console:local .
```

## CI/CD Container Pipeline

GitHub Actions workflow: `.github/workflows/docker-image.yml`

It will:

- trigger on pushes to `main`, tags `v*`, and manual dispatch
- build `apps/console`'s image with Buildah
- push to GitHub Container Registry as `ghcr.io/<owner>/<repo>/console`, tagged by branch, tag, sha, and `latest` on the default branch

## Configuration Model

- Server reads its configuration via `apps/console/src/server/env.ts` / `config-loader.ts` at
  startup — see `docs/knowledge/console-configuration.md` for the full variable reference.

## Development Notes

- Monorepo uses PNPM workspaces (`pnpm-workspace.yaml`) and Turborepo (`turbo.json`) for task orchestration.
- RPC client code is generated via:

```bash
pnpm --dir packages/authz-rpc codegen
```

- REST client code is generated via:

```bash
pnpm --dir packages/api-rest codegen
```

- Follow project conventions in `AGENTS.md` and the `console-ui` skill (`.claude/skills/console-ui/SKILL.md`) for architecture and coding rules.
