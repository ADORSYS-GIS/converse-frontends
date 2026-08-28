# converse-console

This chart deploys the Lightbridge Console UI (`apps/console`, Next.js) as a Node-runtime
server. It is a brand-new chart (ticket #287), not a version bump of `charts/converse-frontend`
— that chart keeps serving the retired Expo static export (`apps/self-service`, nginx), which is
still live in production until Epic 4 retires it, completely unchanged. See
`apps/console/Dockerfile` for the image this chart deploys and
`apps/console/src/server/config-loader.ts` for the config document format referenced throughout
this README.

## Why a separate chart, not a version bump of converse-frontend

`ai-helm`'s running `converse-ui` Application floats on `targetRevision: ">=0.0.0"` against
`oci://ghcr.io/adorsys-gis/charts/converse-frontend` — there is no version high enough to fence a
range that broad off from a new release. Editing that chart's shape in place (container port,
probes, labels, config mechanism) would have been picked up on the very next ArgoCD reconcile and
taken self-service's live Deployment down (wrong port, wrong probes, a `CONSOLE_CONFIG` mount it
can't use). Publishing this work as a new chart directory instead gets it its own GHCR package —
`oci://ghcr.io/adorsys-gis/charts/converse-console` — for free, via `publish-charts-oci.yml`'s
`for cf in charts/*/Chart.yaml` loop. `charts/converse-frontend` is untouched by this PR.

## Published location (OCI)

On every merge to `main`, this chart is packaged and pushed to GHCR as an OCI
artifact (there is no gh-pages Helm repo):

```
oci://ghcr.io/adorsys-gis/charts/converse-console
```

Versions are `MAJOR.MINOR` from `Chart.yaml` plus a patch derived from the commit
count touching the chart directory (monotonic, clean `X.Y.Z`). Pull a specific
version with `--version`, or omit it to get the latest:

```bash
helm show chart oci://ghcr.io/adorsys-gis/charts/converse-console
helm upgrade --install -n ai console \
  oci://ghcr.io/adorsys-gis/charts/converse-console \
  -f my-values.yaml
```

The examples below use the local path (`./charts/converse-console`) for
development; substitute the OCI reference above to deploy a published version.

## Required runtime configuration

The console reads its configuration from a YAML document — **not** from individual
environment variables (that's the old Expo/nginx `EXPO_PUBLIC_*` model in `converse-frontend`; it
has no equivalent here). The document's path is `CONSOLE_CONFIG` (this chart sets it to
`/config/console/config.yaml`); this chart mounts that path from a ConfigMap you supply via
`console.configMaps.console-config.data["config.yaml"]`.

Write your own `config.yaml` the same way `apps/console/config.yaml` is written (see that
file for the full field reference and `src/server/config-loader.ts` for the exact
`{env:VAR}` placeholder syntax): non-secret values — Keycloak issuer, backend URLs, the
public origin — are plain literals in the document; only real secrets (`session.secret`,
optionally `keycloak.clientSecret`) are `{env:VAR}` placeholders, backed by real
environment variables you inject via a Secret (not shown in this chart — wire one up
through `console.controllers.main.containers.frontend.env` / `envFrom`, per app-template's own
container env conventions).

This chart ships a values schema (see [`values.schema.json`](./values.schema.json)) that
requires `console.configMaps.console-config.data["config.yaml"]` to be a non-empty
string — Helm validates this during lint/install/upgrade, so a deployment with no config
document supplied fails fast instead of running with nothing wired up.

### Option A: values file

Create `my-values.yaml`:

```yaml
console:
  configMaps:
    console-config:
      data:
        config.yaml: |
          session:
            secret: '{env:SESSION_SECRET}'
          keycloak:
            issuer: 'https://keycloak.example.com/realms/your-realm'
            clientId: 'console'
            scopes: 'openid profile email offline_access'
            expectedAudiences:
              - 'converse-frontend'
            audienceRequired: true
            rolesClaim: 'lightbridge_api_roles'
          backendUrl: 'https://your-backend.example.com'
          apiBasePath: '/'
          publicBaseUrl: 'https://console.your-domain.example.com'
          permissions: {}
```

Install/upgrade:

- `helm upgrade --install -n ai console ./charts/converse-console -f my-values.yaml`

### Option B: --set-file

The config document is multi-line YAML, so `--set-file` reads it from a file rather than
inlining it on the command line:

```bash
helm upgrade --install -n ai console ./charts/converse-console \
  --set-file console.configMaps.console-config.data.config\\.yaml=./my-config.yaml
```

## Ingress

This chart deliberately ships with `console.ingress.frontend.enabled: false` and no host. The
console's public hostname is decided and owned by the private `ai-helm-values` repo, not this
chart — set `enabled: true` and populate `hosts` there.

## Running alongside converse-frontend (self-service)

Both charts can be installed at once, as separate Helm releases (e.g. `converse-ui` for
self-service on `converse-frontend`, `console` for this chart), in the same namespace, without
resource-name collisions — app-template's generated object names, label selectors and Service
selectors are all release-scoped (derived from `.Release.Name`). This chart's own labels
(`console` / `console-app`) are deliberately distinct from `converse-frontend`'s
(`converse-frontend` / `converse-frontend-app`) so the two remain easy to tell apart by hand
(`kubectl get pods -l app=...`), even though nothing in either chart's own templates depends on
that for correctness.
