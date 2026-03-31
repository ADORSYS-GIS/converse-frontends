# Development Setup — Converse-frontends

> Sources: `GETTING_STARTED.md`, `package.json`, `apps/self-service/package.json`, `compose.yml`, `Dockerfile`

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 22.x | Matches `node:22-alpine` base image in Dockerfile |
| pnpm | Latest via corepack | Enabled with `corepack enable` |
| Docker | 24.x+ | Required for local service stack |
| Git | 2.40+ | Standard |
| Expo CLI | Bundled via `expo` package | No global install needed |

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/adorsys-gis/converse-frontends.git
cd converse-frontends
```

### 2. Install Dependencies

```bash
# Enable corepack (ships Node.js 16.9+)
corepack enable

# Install all workspace dependencies and run postinstall codegen
pnpm install
```

> `postinstall` automatically runs `pnpm codegen:all`, which regenerates the `@lightbridge/api-rest` client from the OpenAPI specs in `openapi/`. This must succeed before you can start the app.

### 3. Configure Environment Variables

The app reads runtime config from `config.json` (injected at container start by `entrypoint.sh`). For local development, the Expo app reads from environment variables directly.

The following `EXPO_PUBLIC_*` variables must be set:

| Variable | Required | Description | Local Example |
|----------|----------|-------------|---------------|
| `EXPO_PUBLIC_BACKEND_URL` | **Yes** | LightBridge AuthZ API base URL | `http://localhost:18888` (WireMock) |
| `EXPO_PUBLIC_USAGE_URL` | **Yes** | LightBridge Usage API base URL | `http://localhost:18888` (WireMock) |
| `EXPO_PUBLIC_GATEWAY_URL` | No | Converse AI gateway base URL (display only) | `http://localhost:18888` |
| `EXPO_PUBLIC_ANALYTICS_URL` | No | Analytics endpoint | `http://localhost:18888` |
| `EXPO_PUBLIC_KEYCLOAK_ISSUER` | **Yes** | Keycloak realm issuer URL | `http://localhost:13444/realms/master` |
| `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID` | **Yes** | Keycloak OAuth2 client ID | `converse-frontend` |
| `EXPO_PUBLIC_KEYCLOAK_SCHEME` | No | URI scheme for redirect (default `https`) | `http` |

### 4. Start Local Services

The `compose.yml` defines two local backing services:

```bash
docker compose up -d
```

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `keycloak-26` | `quay.io/keycloak/keycloak:26.4.0` | `13444` | OAuth2/OIDC provider (dev mode, imports realm from `.docker/keycloak-config/`) |
| `wiremock` | `wiremock/wiremock:3.13.2` | `18888` | Mock LightBridge backend (stubs in `wiremock/`) |

> WireMock runs with `--enable-stub-cors` and `--global-response-templating`. All API stubs live in `wiremock/`.

---

## Running Locally

### Web (browser)

```bash
pnpm web
# or
pnpm --filter self-service web
```

App available at: `http://localhost:8081`

### iOS (requires macOS + Xcode)

```bash
pnpm ios
```

### Android (requires Android Studio / emulator)

```bash
pnpm android
```

### Native dev server (Expo Go / dev client)

```bash
pnpm dev
# or
pnpm --filter self-service start
```

> All `pre*` scripts automatically re-run codegen before starting. If you update an OpenAPI spec, restart the dev server and codegen will re-run.

---

## Running Tests

Tests use **Playwright** (E2E only — no unit test runner is configured at the root):

```bash
# Run Playwright tests (requires app to be running)
pnpx playwright test
```

---

## Linting and Formatting

```bash
# Check only (no writes)
pnpm lint

# Fix and format
pnpm format
```

Both commands run ESLint + Prettier across all `*.{js,jsx,ts,tsx,json,css,md}` files.

---

## API Client Codegen

The `packages/api-rest` client is **auto-generated** from OpenAPI specs. Never hand-edit files in `packages/api-rest/src/`.

```bash
# Regenerate the API client
pnpm codegen

# Regenerate all packages that support codegen
pnpm codegen:all
```

This is triggered automatically on `pnpm install` (via `postinstall`).

---

## Building for Production

```bash
# Export web bundle (Expo static export)
pnpm --dir apps/self-service exec expo export --platform web --output-dir dist

# Build Docker image
docker build -t converse-frontend .
```

The multi-stage Dockerfile:
1. **Build stage** (`node:22-alpine`): runs codegen, then `expo export --platform web`
2. **Runtime stage** (`nginx:1.27-alpine-slim`): serves the static bundle; `entrypoint.sh` generates `config.json` from environment variables at container start

---

## Deployment

| Environment | Trigger | Image Tag | Registry |
|-------------|---------|-----------|----------|
| Any branch | Push to `main` or tagged branch | `branch-name`, `sha-<short>`, `latest` (main only) | `ghcr.io/adorsys-gis/converse-frontends` |
| Production | Push `v*` tag | Semver tag + `sha-<short>` | `ghcr.io/adorsys-gis/converse-frontends` |

Images are built for `linux/amd64` and `linux/arm64` (multi-platform).

Deployment to Kubernetes uses the Helm chart in `charts/converse-frontend/`. See `infrastructure.md` for Helm deployment details.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `IDBDatabase.transaction: 'keyval' is not a known object store name` | Clear browser IndexedDB for `localhost`. The app uses `lightbridge-web-storage` / `auth` store; a stale `keyval-store` can conflict. |
| Codegen fails on install | Ensure the OpenAPI spec files in `openapi/` are valid YAML and `packages/api-rest/openapi-ts.config.ts` references them correctly. |
| Keycloak login redirects fail | Verify `EXPO_PUBLIC_KEYCLOAK_ISSUER` is reachable and the redirect URI `http://localhost:8081/auth` is registered in the Keycloak client. |
| WireMock returns 404 | Check that a matching stub exists in `wiremock/mappings/`. Restart with `docker compose restart wiremock` after adding stubs. |
| `pnpm install` hangs | The `.pnpm-store` is large; first install may take time. Subsequent installs use the local cache. |
