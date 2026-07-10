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

### 1b. Helm Chart Publish (`publish-charts-oci.yml`)

On merge to `main` (paths `charts/**`), each application chart under `charts/` is
packaged and pushed to GHCR as an OCI artifact at
`oci://ghcr.io/adorsys-gis/charts/<name>` (no gh-pages Helm
repo). The chart version is derived at publish time — `MAJOR.MINOR` from
`Chart.yaml` plus a patch equal to the commit count touching the chart dir — so it
is monotonic and never committed back. Publishing is idempotent (skips a version
already in the registry). Authenticates with the built-in `GITHUB_TOKEN` +
`permissions: { packages: write }`, same as the image workflow.

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

Deployment to Kubernetes is driven by a separate GitOps process (ArgoCD in the
`ai-helm` repo). Its `converse-ui` Application consumes the chart published to
`oci://ghcr.io/adorsys-gis/charts/converse-frontend` and floats
on a semver range, while `argocd-image-updater` tracks the container image tag.
For local/manual work, install the chart from `charts/converse-frontend/`.

Rollback: re-deploy a previous image tag via Helm. See `runbooks.md` for the rollback procedure.

---

## Secrets Management

`docker-image.yml` authenticates to GHCR using the built-in `secrets.GITHUB_TOKEN` (auto-issued and rotated per workflow run), not a custom PAT — the job's `permissions: { packages: write }` is sufficient on its own. This replaced an earlier `GHCR_TOKEN` custom PAT, which expired ~90 days after creation and caused every `docker-image` run to fail at the login step until fixed.

For manual/local pushes outside CI (see the "Rebuild and Push Docker Image Manually" runbook), a personal PAT with `write:packages` scope is still required, since `GITHUB_TOKEN` only exists inside Actions runs.

Runtime secrets (Keycloak credentials, backend URLs) are **not** stored in GitHub. They are injected at deploy time via Helm values or Kubernetes secrets. See `infrastructure.md` for runtime secret injection details.
