# converse-lci

This chart deploys the Lightbridge Code Intelligence UI (`apps/lci`, Next.js) as a Node-runtime
server. It's its own chart directory, which gets it a dedicated GHCR package via
`publish-charts-oci.yml`'s `for cf in charts/*/Chart.yaml` loop, so nothing else's floating semver
range can pick this up by accident. See `apps/lci/Dockerfile` for the image this chart deploys.

## Published location (OCI)

On every merge to `main`, this chart is packaged and pushed to GHCR as an OCI
artifact (there is no gh-pages Helm repo):

```
oci://ghcr.io/adorsys-gis/charts/converse-lci
```

Versions are `MAJOR.MINOR` from `Chart.yaml` plus a patch derived from the commit
count touching the chart directory (monotonic, clean `X.Y.Z`). Pull a specific
version with `--version`, or omit it to get the latest:

```bash
helm show chart oci://ghcr.io/adorsys-gis/charts/converse-lci
helm upgrade --install -n ai lci \
  oci://ghcr.io/adorsys-gis/charts/converse-lci \
  -f my-values.yaml
```

The examples below use the local path (`./charts/converse-lci`) for development; substitute the
OCI reference above to deploy a published version.

## Required runtime configuration

This app reads its configuration from **plain environment variables**, not a mounted YAML
document. This chart ships `lci.controllers.main.containers.frontend.env` **empty by default**; a
real deployment supplies its own complete env map.

This chart ships a values schema (see [`values.schema.json`](./values.schema.json)) requiring
`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `CONTROL_PLANE_URL`, and at least one of `OIDC_REDIRECT_URI` /
`OIDC_POST_LOGOUT_REDIRECT_URI` to be non-empty strings — `helm lint`/`helm template`/`helm
install` all fail fast on a deployment missing them, rather than silently booting on the app
code's own `http://localhost:*` dev fallbacks.

### Full environment variable reference

Read from `apps/lci/src/lib/auth/*`, `apps/lci/src/lib/server/admin.ts`,
`apps/lci/src/containers/settings-centre.tsx`, and `apps/lci/next.config.mjs`.

| Variable | Required | Notes |
| --- | --- | --- |
| `OIDC_ISSUER` | **Yes** | Throws at request time if unset. No default. |
| `OIDC_CLIENT_ID` | **Yes** | Throws at request time if unset. No default. |
| `OIDC_REDIRECT_URI` or `OIDC_POST_LOGOUT_REDIRECT_URI` | **At least one** | `appBaseUrl()` (this app's public origin, used for every app-relative redirect) derives from whichever is set and throws if neither is. Each individually still falls back to a `localhost:3001` dev default when read on its own elsewhere in the app — only `appBaseUrl()` has no fallback. |
| `CONTROL_PLANE_URL` | Effectively yes | Falls back to `http://localhost:8080/api/v2` if unset — **not** enforced by app code, so a real deployment omitting it fails silently rather than loudly. This chart's schema requires it for that reason. |
| `OIDC_CLIENT_SECRET` | No | Omit for a public client + PKCE; confirm this app's registered client type before setting it. |
| `OIDC_AUDIENCE` | No | JWT `aud` check is skipped entirely when unset. |
| `OIDC_JWKS_URI` | No | Derived from `OIDC_ISSUER` (`{issuer}/protocol/openid-connect/certs`) when unset. |
| `OIDC_TOKEN_URI` | No | Derived from `OIDC_ISSUER` (`{issuer}/protocol/openid-connect/token`) when unset. |
| `OIDC_SCOPE` | No | Defaults to `openid profile email`. |
| `PERMISSIONS_CLAIM` | No | Defaults to `permissions`. |
| `GITHUB_APP_INSTALL_URL` | No | Defaults to `https://github.com/apps/lightbridge-assistant`. |
| `NEXT_PUBLIC_GRAFANA_URL` | No | **Has no effect set here.** Next.js inlines every `NEXT_PUBLIC_*` variable into the client bundle at `next build` time — setting it as a container env var at deploy time changes nothing. It must be an `ARG`/build-time input to the image build instead, if this ever needs wiring up. |

### Option A: values file

```yaml
lci:
  controllers:
    main:
      containers:
        frontend:
          env:
            OIDC_ISSUER: 'https://auth.your-domain.example'
            OIDC_CLIENT_ID: 'lightbridge-lci'
            OIDC_REDIRECT_URI: 'https://lci.your-domain.example/api/auth/callback'
            OIDC_POST_LOGOUT_REDIRECT_URI: 'https://lci.your-domain.example'
            CONTROL_PLANE_URL: 'https://your-control-plane.example/api/v2'
```

Install/upgrade:

- `helm upgrade --install -n ai lci ./charts/converse-lci -f my-values.yaml`

## Runtime white-label branding (optional)

`apps/lci` renders its own built-in mark by default. To supply a real logo instead, it reads
`LCI_BRANDING_LOGO_PATH`/`LCI_BRANDING_LOGO_LIGHT_PATH` (host-absolute paths) and streams whatever
file is there at `GET /branding/logo`/`GET /branding/logo-light` — see `apps/lci/.env.example`.
This chart's job is only to get the logo file(s) onto disk at those paths.

Disabled by default: `lci.configMaps.branding-logo`/`branding-logo-light` and
`lci.persistence.branding-logo`/`branding-logo-light` are all `enabled: false` out of the box, so
an operator who never touches this renders no ConfigMap/mount at all — app-template drops a
`persistence`/`configMaps` entry entirely when its own `enabled` is false.

Two ConfigMaps, not one: app-template's own values schema forbids a ConfigMap entry from carrying
both `data` and `binaryData`, so `branding-logo`/`branding-logo-light` are separate resources.
Both mount into the SAME `/tmp/branding/` directory via their own `subPath`, so the end state on
disk is one directory holding both files — matching what `LCI_BRANDING_LOGO_PATH`/
`LCI_BRANDING_LOGO_LIGHT_PATH` should then point at.

```yaml
lci:
  controllers:
    main:
      containers:
        frontend:
          env:
            LCI_BRANDING_LOGO_PATH: /tmp/branding/logo.png
            LCI_BRANDING_LOGO_LIGHT_PATH: /tmp/branding/logo-light.png
  configMaps:
    branding-logo:
      enabled: true
      binaryData:
        logo.png: <base64-encoded PNG/SVG/JPEG/WebP — the dark-theme mark>
    branding-logo-light:
      enabled: true
      binaryData:
        logo-light.png: <base64-encoded PNG/SVG/JPEG/WebP — the light-theme mark>
  persistence:
    branding-logo:
      enabled: true
    branding-logo-light:
      enabled: true
```

```bash
helm upgrade --install -n ai lci ./charts/converse-lci \
  --set lci.configMaps.branding-logo.enabled=true \
  --set lci.persistence.branding-logo.enabled=true \
  --set-file lci.configMaps.branding-logo.binaryData.logo\\.png=./logo.b64 \
  --set lci.configMaps.branding-logo-light.enabled=true \
  --set lci.persistence.branding-logo-light.enabled=true \
  --set-file lci.configMaps.branding-logo-light.binaryData.logo-light\\.png=./logo-light.b64
```

(`logo.b64` = the file already base64-encoded, e.g. `base64 -i logo.png -o logo.b64`, since
`binaryData` values are base64 strings, not raw bytes.)

`LOGO_LIGHT` is not independently optional: setting it without `LOGO` renders no mark at all under
`black`, this app's default theme (the dark mark doubles as both the default and dark-theme mark).

## Ingress

This chart deliberately ships with `lci.ingress.frontend.enabled: false` and no host. This app's
public hostname is decided and owned by the private `ai-helm-values` repo, not this chart — set
`enabled: true` and populate `hosts` there.

## Running alongside converse-console

Both charts can be installed at once, as separate Helm releases, in the same namespace, without
resource-name collisions — app-template's generated object names, label selectors and Service
selectors are all release-scoped (derived from `.Release.Name`). This chart's own labels (`lci` /
`lci-app`) are deliberately distinct from `converse-console`'s (`console` / `console-app`) so the
two remain easy to tell apart by hand (`kubectl get pods -l app=...`), even though nothing in
either chart's own templates depends on that for correctness.
