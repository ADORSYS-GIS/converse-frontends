# CI/CD — Converse-frontends

> Source of truth: `.github/workflows/`

---

## Pipeline Overview

CI/CD is implemented with **GitHub Actions**. There are two categories of workflows:

### 1. Docker Image Build & Push (`docker-image.yml`)

This is the primary delivery pipeline.

```
Trigger: push to main / tagged branch / v* tag / workflow_dispatch
       │
       ▼
   Checkout code
       │
       ▼
   Set up Docker Buildx (multi-platform)
       │
       ▼
   Log in to GHCR (ghcr.io)
       │
       ▼
   Extract metadata (tags, labels)
       │
       ▼
   Build & push multi-platform image (linux/amd64, linux/arm64)
```

### 2. Agentic Code Review Workflows

Several workflows power an AI-assisted review system:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `qwen-review.yml` | `@qwen-code review` comment on PR | Triggers an on-demand agentic code review |
| `qwen-dispatch.yml` | Dispatched by `qwen-review` | Runs the actual review agent |
| `qwen-invoke.yml` | Called by dispatch | Invokes the underlying AI model |
| `qwen-triage.yml` | Issue / PR events | Triages new issues/PRs with AI |
| `qwen-scheduled-triage.yml` | Scheduled (cron) | Periodic triage of open items |
| `opencode.yml` | Various | OpenCode AI agent workflow |

---

## Required Checks

No required status checks are enforced at the workflow level (branch protection rules are configured on GitHub, not in YAML). As a convention per `AGENTS.md`:

- All CI checks must pass before a PR can be merged
- At least one approving review is required
- PRs must have a clear description

---

## Caching Strategy

The Docker build workflow uses **GitHub Actions cache** for Docker layer caching:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

This caches Docker build layers between runs. The pnpm dependency install step in the Dockerfile uses a `--mount=type=cache` (BuildKit cache mount) targeting `/pnpm/store` to cache the package store across builds.

---

## Artifacts & Releases

- **Container images** are pushed to GitHub Container Registry (GHCR): `ghcr.io/adorsys-gis/converse-frontends`
- **Image tags** generated per build:
  - `branch-name` — for branch pushes
  - `v*` — for version tags (semver)
  - `sha-<short>` — for every build (commit SHA)
  - `latest` — only on pushes to the default branch (`main`)
- Images are built as **multi-platform** manifests (`linux/amd64`, `linux/arm64`)
- **No SBOM or signing** is configured in the current workflows

---

## Environments & Promotion

| Environment | Trigger | Image Used |
|-------------|---------|-----------|
| Development / Preview | Push to any branch | `ghcr.io/...:<branch-name>` |
| Production | Push `v*` tag to `main` | `ghcr.io/...:v<semver>` |

Deployment to Kubernetes is **not automated** in the current GitHub Actions workflows — it is performed manually or via a separate GitOps process using the Helm chart in `charts/converse-frontend/`.

Rollback: re-deploy a previous image tag via Helm. See `runbooks.md` for the rollback procedure.

---

## Secrets Management

| Secret | Where Used | Purpose |
|--------|-----------|---------|
| `GHCR_TOKEN` | `docker-image.yml` | Authenticates Docker push to GHCR |

The `GHCR_TOKEN` is a GitHub Personal Access Token (PAT) with `write:packages` scope, stored as a repository secret.

Runtime secrets (Keycloak credentials, backend URLs) are **not** stored in GitHub. They are injected at deploy time via Helm values or Kubernetes secrets. See `infrastructure.md` for runtime secret injection details.
