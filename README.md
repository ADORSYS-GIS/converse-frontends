# Converse Frontends

Cross-platform self-service frontend monorepo for Lightbridge/GIS use cases.  
It provides a single codebase for web and mobile experiences, with shared UI primitives, API hooks, i18n, and runtime configuration.

## Why This Project

This repository exists to:

- ship a self-service portal quickly across web, Android, and iOS
- keep UI, API access, auth, and translations consistent in one monorepo
- separate concerns clearly:
  - app/view routing in `apps/self-service`
  - reusable UI in `packages/ui`
  - data access and sync hooks in `packages/hooks`
  - generated REST client in `packages/api-rest`
  - native helpers in `packages/api-native`
  - translations in `packages/i18n`
- support runtime configuration on web (no rebuild needed per environment)

## Tech Stack

- Expo + Expo Router
- React / React Native / React Native Web
- Tailwind (NativeWind) + CVA-based UI variants
- TanStack Query
- Keycloak-based auth flow
- PNPM workspaces monorepo

## Repository Layout

```text
apps/
  self-service/        # Expo app (routes, screens, views)
packages/
  ui/                  # UI primitives
  hooks/               # Query/service hooks
  api-rest/            # Generated REST client (Hey API)
  api-native/          # Native wrappers
  i18n/                # i18n provider + resources
openapi/
  backend.yaml         # OpenAPI source for api-rest codegen
.github/workflows/
  docker-image.yml     # Build + push container to GHCR
Dockerfile             # Production web image build
compose.yml            # Local Keycloak helper
```

## Prerequisites

- Node.js 22+
- PNPM (via Corepack recommended)
- Docker (for container build/run)

## Install

```bash
corepack enable
pnpm install
```

## Run Locally

### 1) Prepare environment variables (dev)

The app expects these variables:

- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_KEYCLOAK_ISSUER`
- `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID`
- `EXPO_PUBLIC_KEYCLOAK_SCHEME`

Create `apps/self-service/.env` (or export in shell) with your values.

Example:

```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080
EXPO_PUBLIC_KEYCLOAK_ISSUER=http://localhost:13444/realms/vymalo-wh-01
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=self-service
EXPO_PUBLIC_KEYCLOAK_SCHEME=self-service
```

### 2) Optional: start local Keycloak

```bash
docker compose up keycloak-26
```

Keycloak will run on `http://localhost:13444`.

### 3) Start app

From repo root:

```bash
pnpm dev      # Expo dev server
pnpm web      # open web target
pnpm android  # Android
pnpm ios      # iOS
```

## How To Test

There is no dedicated unit/integration test suite configured yet. Current quality checks are:

```bash
pnpm lint
```

Recommended local validation before merge:

- run `pnpm lint`
- run `pnpm web` and verify login/navigation flows
- verify backend connectivity and token-protected requests

## Production Container

This repo includes a production-ready web image:

- multi-stage build (`node:22-alpine` -> `nginx:alpine`)
- generates REST client during image build
- exports static web assets via Expo
- serves with Nginx SPA fallback
- generates `/config.json` at container startup from env vars

Build locally:

```bash
docker build -t converse-frontends:local -f Dockerfile .
```

Run locally:

```bash
docker run --rm -p 8080:80 \
  -e EXPO_PUBLIC_BACKEND_URL=http://localhost:8080 \
  -e EXPO_PUBLIC_KEYCLOAK_ISSUER=http://localhost:13444/realms/vymalo-wh-01 \
  -e EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=self-service \
  -e EXPO_PUBLIC_KEYCLOAK_SCHEME=self-service \
  converse-frontends:local
```

Then open `http://localhost:8080`.

## CI/CD Container Pipeline

GitHub Actions workflow: `.github/workflows/docker-image.yml`

It will:

- trigger on pushes to `main`/`master`, tags `v*`, and manual dispatch
- build the Docker image with Buildx
- push to GitHub Container Registry:
  - `ghcr.io/<owner>/<repo>`
  - tags: branch, tag, sha, and `latest` on default branch

## How This Fits With Common Existing Projects

This frontend integrates cleanly with standard enterprise platform components:

- Keycloak: OIDC issuer/client configuration already modeled in runtime config
- OpenAPI-first backends: `packages/api-rest` is generated from `openapi/backend.yaml`
- Kubernetes/OpenShift: image is stateless and configurable via environment variables
- GitHub ecosystem: native GHCR publish pipeline included
- API gateway setups (Kong, NGINX Ingress, Traefik): served as static SPA behind reverse proxy

## Configuration Model

- Dev/native: uses `EXPO_PUBLIC_*` environment variables
- Web production: app fetches `/config.json` at runtime
- Container startup script renders `config.json` from template, so the same image can run in different environments

## Development Notes

- Monorepo uses PNPM workspaces and hoisted node linker (`.npmrc`)
- API client code is generated via:

```bash
pnpm --dir packages/api-rest codegen
```

- Follow project conventions in `AGENTS.md` for architecture and coding rules.
