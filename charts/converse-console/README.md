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

## Runtime white-label branding (optional)

Owner design (issue #368): a deployment can override the built-in logo and/or a handful of
daisyUI colour custom properties (`--color-primary`, …) without a rebuild — `apps/console`'s
`config.yaml` gains an optional `branding:` block (`logo`/`style`, both host-absolute paths;
see that file's own comment and `src/server/env.ts`), served back to the browser by
`GET /branding/logo` and `GET /branding/override.css`. This chart's job is only to get the two
files onto disk at those paths — it does not itself edit `console-config`'s `config.yaml`.

Disabled by default: `console.configMaps.branding-logo`/`branding-style` and
`console.persistence.branding-logo`/`branding-style` are all `enabled: false` out of the box, so
an operator who does nothing here gets no extra ConfigMap, no extra volume, and no behaviour
change at all.

**Two separate ConfigMaps, not one**, even though the owner's design describes a single mounted
directory: app-template's own values schema forbids one ConfigMap entry from carrying both
`data` (text) and `binaryData` (base64) — see `values.yaml`'s own comment on
`persistence.branding-logo` for the exact schema clause. `logo.png` (binary) goes in
`branding-logo`'s `binaryData`; `override.style` (plain CSS text) goes in `branding-style`'s
`data`. Both mount into the SAME `/tmp/branding/` directory via their own `subPath`, so the end
state on disk is identical to what the owner described — two files in one directory.

```yaml
console:
  configMaps:
    console-config:
      data:
        config.yaml: |
          # ...your usual config.yaml fields...
          branding:
            logo: /tmp/branding/logo.png
            style: /tmp/branding/override.style
    branding-logo:
      enabled: true
      binaryData:
        logo.png: <base64-encoded PNG/SVG/JPEG/WebP>
    branding-style:
      enabled: true
      data:
        override.style: |
          [data-theme="black"] {
            --color-primary: #ff6600;
          }
  persistence:
    branding-logo:
      enabled: true
    branding-style:
      enabled: true
```

`--set-file` works here too, the same way it does for `console-config`'s own `config.yaml`:

```bash
helm upgrade --install -n ai console ./charts/converse-console \
  --set console.configMaps.branding-logo.enabled=true \
  --set console.persistence.branding-logo.enabled=true \
  --set-file console.configMaps.branding-logo.binaryData.logo\\.png=./logo.b64 \
  --set console.configMaps.branding-style.enabled=true \
  --set console.persistence.branding-style.enabled=true \
  --set-file console.configMaps.branding-style.data.override\\.style=./override.style
```

(`logo.b64` is the logo file already base64-encoded — `base64 -i logo.png -o logo.b64` — since
`binaryData` values are base64 strings, not raw bytes.)

`override.style` is filtered server-side before it is ever served to a browser (only
`:root`/`[data-theme="…"]` custom-property declarations survive — anything else, including a
whole other selector, is dropped and logged): a typo here can recolour the console, never break
its layout.

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
