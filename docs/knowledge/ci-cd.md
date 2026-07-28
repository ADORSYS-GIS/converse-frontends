# CI/CD — Converse-frontends

> Source of truth: `.github/workflows/`

---

## Pipeline Overview

CI/CD is implemented with **GitHub Actions**. All Linux jobs run on the
self-hosted **`adorsys-gis-runner`** pool (not GitHub-hosted `ubuntu-latest`).
That runner bakes rootless **Buildah/Podman** (no Docker daemon / dind) and is
integrated with a **Turbo remote cache**, so builds run through `turbo` and reuse
cached outputs across runs. There are two categories of workflows:

### 1. Docker Image Build & Push (`docker-image.yml`)

This is the primary delivery pipeline. The web bundle is built **on the runner**
via Turbo, then baked into a thin nginx image with Buildah — the image has no
build stage, no Node/pnpm, and no Docker/BuildKit layer cache (caching lives in
Turbo). Single-arch **`linux/amd64`** (every cluster node is amd64).

```
Trigger: push to main / tagged branch / v* tag / workflow_dispatch
       │
       ▼  (on adorsys-gis-runner)
   Checkout → pnpm install (runs codegen) → turbo run build:web   # → apps/self-service/dist, Turbo-cached
       │
       ▼
   Extract metadata (tags, labels) · buildah login to ghcr.io
       │
       ▼
   buildah build (amd64, no layer cache)  →  export tar  →  Trivy scan (HIGH/CRITICAL gate)
       │
       ▼
   buildah push (all tags)
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

### 2. Agentic Code Review

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `opencode.yml` | Various | OpenCode AI agent workflow |

The Qwen-based review/triage subsystem (`qwen-review.yml`, `qwen-dispatch.yml`,
`qwen-invoke.yml`, `qwen-triage.yml`, `qwen-scheduled-triage.yml`) was removed —
it had become noise rather than signal.

---

## Required Checks

No required status checks are enforced at the workflow level (branch protection rules are configured on GitHub, not in YAML). As a convention per `AGENTS.md`:

- All CI checks must pass before a PR can be merged
- At least one approving review is required
- PRs must have a clear description

---

## Caching Strategy

Caching is handled by **Turborepo**, not by the Docker build. `turbo run build:web`
(and `build-storybook`) hash their inputs and restore outputs from the
`adorsys-gis-runner`'s integrated **Turbo remote cache** — an unchanged input tree
replays instantly (`>>> FULL TURBO`) instead of re-running `expo export`.

The Docker build itself is deliberately **uncached**: the old GHA layer cache
(`cache-from/to: type=gha`) and the Dockerfile's BuildKit `--mount=type=cache`
pnpm-store mount were both removed. Buildah builds a thin runtime image with no
`--layers`/`--cache-from`. (Note: `.turbo/` must stay in `.gitignore` — otherwise
turbo counts its own run logs as task inputs and never hits the cache.)

---

## Artifacts & Releases

- **Container images** are pushed to GitHub Container Registry (GHCR): `ghcr.io/adorsys-gis/converse-frontends`
- **Image tags** generated per build:
  - `branch-name` — for branch pushes
  - `v*` — for version tags (semver)
  - `sha-<short>` — for every build (commit SHA)
  - `latest` — only on pushes to the default branch (`main`)
- Images are built **single-arch** (`linux/amd64`) — every cluster node is amd64
- Built with rootless **Buildah**; a **Trivy** scan (HIGH/CRITICAL, `ignore-unfixed`) gates the push
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
