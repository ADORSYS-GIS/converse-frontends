# converse-frontend

This chart deploys the Lightbridge Console UI (`apps/console`, Next.js) as a Node-runtime
server. As of chart `1.0.0` (ticket #287) it no longer serves the retired Expo static
export (`apps/self-service`, nginx) — that packaging was a hard cutover, not a parallel
option. See `apps/console/Dockerfile` for the image this chart deploys and
`apps/console/src/server/config-loader.ts` for the config document format referenced
throughout this README.

`apps/self-service` keeps running in production (its own ArgoCD app, its own image, pinned
to the last pre-1.0.0 release of this chart) until Epic 4 retires it. If you're deploying
that app, do not point its ArgoCD Application at `1.x` of this chart — see the version note
in `Chart.yaml`.

## Published location (OCI)

On every merge to `main`, this chart is packaged and pushed to GHCR as an OCI
artifact (there is no gh-pages Helm repo):

```
oci://ghcr.io/adorsys-gis/charts/converse-frontend
```

Versions are `MAJOR.MINOR` from `Chart.yaml` plus a patch derived from the commit
count touching the chart directory (monotonic, clean `X.Y.Z`). Pull a specific
version with `--version`, or omit it to get the latest:

```bash
helm show chart oci://ghcr.io/adorsys-gis/charts/converse-frontend
helm upgrade --install -n ai console \
  oci://ghcr.io/adorsys-gis/charts/converse-frontend \
  -f my-values.yaml
```

The examples below use the local path (`./charts/converse-frontend`) for
development; substitute the OCI reference above to deploy a published version.

## Required runtime configuration

The console reads its configuration from a YAML document — **not** from individual
environment variables (that was the old Expo/nginx `EXPO_PUBLIC_*` model; it has no
equivalent here). The document's path is `CONSOLE_CONFIG` (this chart sets it to
`/config/console/config.yaml`); this chart mounts that path from a ConfigMap you supply via
`conversefrontend.configMaps.console-config.data["config.yaml"]`.

Write your own `config.yaml` the same way `apps/console/config.yaml` is written (see that
file for the full field reference and `src/server/config-loader.ts` for the exact
`{env:VAR}` placeholder syntax): non-secret values — Keycloak issuer, backend URLs, the
public origin — are plain literals in the document; only real secrets (`session.secret`,
optionally `keycloak.clientSecret`) are `{env:VAR}` placeholders, backed by real
environment variables you inject via a Secret (not shown in this chart — wire one up
through `conversefrontend.controllers.main.containers.frontend.env` /
`envFrom`, per app-template's own container env conventions).

This chart ships a values schema (see [`values.schema.json`](./values.schema.json)) that
requires `conversefrontend.configMaps.console-config.data["config.yaml"]` to be a non-empty
string — Helm validates this during lint/install/upgrade, so a deployment with no config
document supplied fails fast instead of running with nothing wired up.

### Option A: values file

Create `my-values.yaml`:

```yaml
conversefrontend:
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

- `helm upgrade --install -n ai console ./charts/converse-frontend -f my-values.yaml`

### Option B: --set

The config document is multi-line YAML, so `--set-file` reads it from a file rather than
inlining it on the command line:

```bash
helm upgrade --install -n ai console ./charts/converse-frontend \
  --set-file conversefrontend.configMaps.console-config.data.config\\.yaml=./my-config.yaml
```

## Ingress

This chart deliberately ships with `conversefrontend.ingress.frontend.enabled: false` and
no host. The console's public hostname is decided and owned by the private
`ai-helm-values` repo, not this chart — set `enabled: true` and populate `hosts` there.

## Two apps, one chart, two releases

Both `apps/console` (this version) and, until Epic 4, `apps/self-service` (an older,
pre-1.0.0 version of this chart) can run at once in the same namespace, as long as they're
installed under **different Helm release names** (e.g. `console` and `converse-ui`).
app-template's resource names, label selectors and generated ConfigMap/Service/Deployment
names are all release-scoped (derived from `.Release.Name`), so two releases of this chart
in one namespace do not collide on object names — verified with
`helm template converse-ui ...` vs `helm template console ...` against identical values,
which render entirely distinct resource names. The one thing this chart does _not_
release-scope is the informational `global.labels.app` / pod `app` label (`console` /
`console-app` as of `1.0.0`) — those are plain strings, not templated off the release name,
so don't reuse this chart's own default values file verbatim for a second release without
changing them, or two unrelated Deployments will carry the same custom label value.
