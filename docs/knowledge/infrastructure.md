# Infrastructure — Converse-frontends

> Sources: `charts/converse-frontend/values.yaml`, `Dockerfile`, `.docker/nginx/`, `compose.yml`

---

## Environments

| Environment | Purpose | Image Source |
|-------------|---------|-------------|
| **Local dev** | Developer workstation | `pnpm web` (Expo dev server) |
| **Local services** | Mock backends via Docker Compose | `compose.yml` |
| **Production** | Kubernetes cluster | `ghcr.io/adorsys-gis/converse-frontends:<tag>` |

No staging environment is defined in the codebase. Production is the only declared Kubernetes target.

---

## Provisioning

The frontend is deployed to Kubernetes via a **Helm chart** located at `charts/converse-frontend/`.

```bash
# Example: install/upgrade
helm upgrade --install converse-frontend ./charts/converse-frontend \
  --set conversefrontend.controllers.main.containers.frontend.image.tag=<tag> \
  --set conversefrontend.controllers.main.containers.frontend.env.EXPO_PUBLIC_BACKEND_URL=<url> \
  ...
```

The chart uses **app-template** style values (from the `conversefrontend` key). Key Helm values:

| Value Path | Default | Description |
|-----------|---------|-------------|
| `conversefrontend.controllers.main.replicas` | `2` | Number of pod replicas |
| `conversefrontend.controllers.main.strategy` | `RollingUpdate` | Deployment strategy |
| `conversefrontend.controllers.main.containers.frontend.image.repository` | `ghcr.io/adorsys-gis/converse-frontends` | Container image |
| `conversefrontend.controllers.main.containers.frontend.image.tag` | `sha-9d48` | Image tag (override per deploy) |
| `conversefrontend.controllers.main.containers.frontend.image.pullPolicy` | `IfNotPresent` | Image pull policy |

---

## Runtime Configuration: Environment Variables

The container uses an `entrypoint.sh` script (`/docker-entrypoint.d/40-runtime-config.sh`) that runs at startup and generates `config.json` from a template using `envsubst`.

Variables injected at runtime (set in Helm values or Kubernetes Secret/ConfigMap):

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | **Yes** | LightBridge AuthZ API base URL |
| `EXPO_PUBLIC_USAGE_URL` | **Yes** | LightBridge Usage API base URL |
| `EXPO_PUBLIC_GATEWAY_URL` | No | Converse AI gateway URL (display only) |
| `EXPO_PUBLIC_ANALYTICS_URL` | No | Analytics endpoint URL |
| `EXPO_PUBLIC_KEYCLOAK_ISSUER` | **Yes** | Keycloak realm issuer URL |
| `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID` | **Yes** | Keycloak client ID |
| `EXPO_PUBLIC_KEYCLOAK_SCHEME` | No | URI scheme for redirect (default `https`) |

These variables are **not** baked into the image at build time. They are injected via `envsubst` at container startup, allowing the same image to run in any environment.

---

## Networking

### Kubernetes Service

| Field | Value |
|-------|-------|
| Service type | `ClusterIP` |
| Container port | `80` (HTTP, nginx) |
| Service port | `80` |

The container does not expose HTTPS directly. TLS termination is expected at the ingress/load-balancer level (not defined in this chart).

### Local Docker Compose

| Service | Port Mapping | Description |
|---------|------------|-------------|
| `keycloak-26` | `13444:13444` | Keycloak dev server |
| `wiremock` | `18888:8080` | WireMock mock API server |

---

## Runtime: Nginx Web Server

- **Base image:** `nginx:1.27-alpine-slim`
- **Config:** `.docker/nginx/default.conf` mounted to `/etc/nginx/conf.d/default.conf`
- **Static files:** Served from `/usr/share/nginx/html/` (Expo web export)
- **Health check:** `wget -q -O /dev/null http://127.0.0.1/` — interval 30s, timeout 3s, start period 10s, 3 retries

---

## Resource Limits (Helm defaults)

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | `50m` | `250m` |
| Memory | `64Mi` | `256Mi` |

---

## Probes (Kubernetes)

All three probe types are configured with HTTP GET on port `80` at path `/`:

| Probe | Enabled | Type | Path |
|-------|---------|------|------|
| Liveness | Yes | HTTP | `/` |
| Readiness | Yes | HTTP | `/` |
| Startup | Yes | HTTP | `/` (failureThreshold: 30, periodSeconds: 5) |

---

## Secrets & Config

- **Build-time secrets:** None. The image contains no secrets.
- **Runtime secrets:** Injected via Kubernetes environment variables (from Secrets or ConfigMaps), consumed by `entrypoint.sh` to generate `config.json`.
- **Local dev Keycloak:** Admin credentials in `compose.yml` (`admin` / `password`) are for local development only. Realm config is imported from `.docker/keycloak-config/` at startup.

---

## Rollback & DR

**Rollback procedure:** Re-deploy the previous Helm release with the previous image tag:

```bash
helm rollback converse-frontend <revision>
```

Or pin a specific image tag:

```bash
helm upgrade converse-frontend ./charts/converse-frontend \
  --set conversefrontend.controllers.main.containers.frontend.image.tag=<previous-sha>
```

**Disaster recovery:** The frontend is stateless. There is no database or persistent volume attached to this service. Recovery is a fresh deployment of the container image. Backend data (accounts, projects, API keys, usage metrics) lives in the LightBridge backend (Rust + PostgreSQL) — outside the scope of this repository.
