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
document. This chart ships `lci.controllers.main.containers.frontend.env` with **nothing but the
three OpenTelemetry keys** (see [Tracing](#tracing-opentelemetry) below — two carry a real,
universally-correct value and the third is blank because blank means "do not export"); a real
deployment supplies its own complete env map for everything else.

This chart ships a values schema (see [`values.schema.json`](./values.schema.json)) requiring
`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `CONTROL_PLANE_URL`, and at least one of `OIDC_REDIRECT_URI` /
`OIDC_POST_LOGOUT_REDIRECT_URI` to be non-empty strings — `helm lint`/`helm template`/`helm
install` all fail fast on a deployment missing them, rather than silently booting on the app
code's own `http://localhost:*` dev fallbacks.

### Full environment variable reference

Read from `apps/lci/src/lib/auth/*`, `apps/lci/src/lib/server/admin.ts`,
`apps/lci/src/containers/settings-centre.tsx`, and `apps/lci/next.config.mjs`.

| Variable                                               | Required         | Notes                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OIDC_ISSUER`                                          | **Yes**          | Throws at request time if unset. No default.                                                                                                                                                                                                                                                  |
| `OIDC_CLIENT_ID`                                       | **Yes**          | Throws at request time if unset. No default.                                                                                                                                                                                                                                                  |
| `OIDC_REDIRECT_URI` or `OIDC_POST_LOGOUT_REDIRECT_URI` | **At least one** | `appBaseUrl()` (this app's public origin, used for every app-relative redirect) derives from whichever is set and throws if neither is. Each individually still falls back to a `localhost:3001` dev default when read on its own elsewhere in the app — only `appBaseUrl()` has no fallback. |
| `CONTROL_PLANE_URL`                                    | Effectively yes  | Falls back to `http://localhost:8080/api/v2` if unset — **not** enforced by app code, so a real deployment omitting it fails silently rather than loudly. This chart's schema requires it for that reason.                                                                                    |
| `OIDC_CLIENT_SECRET`                                   | No               | Omit for a public client + PKCE; confirm this app's registered client type before setting it.                                                                                                                                                                                                 |
| `OIDC_AUDIENCE`                                        | No               | JWT `aud` check is skipped entirely when unset.                                                                                                                                                                                                                                               |
| `OIDC_JWKS_URI`                                        | No               | Derived from `OIDC_ISSUER` (`{issuer}/protocol/openid-connect/certs`) when unset.                                                                                                                                                                                                             |
| `OIDC_TOKEN_URI`                                       | No               | Derived from `OIDC_ISSUER` (`{issuer}/protocol/openid-connect/token`) when unset.                                                                                                                                                                                                             |
| `OIDC_SCOPE`                                           | No               | Defaults to `openid profile email`.                                                                                                                                                                                                                                                           |
| `PERMISSIONS_CLAIM`                                    | No               | Defaults to `permissions`.                                                                                                                                                                                                                                                                    |
| `GITHUB_APP_INSTALL_URL`                               | No               | Defaults to `https://github.com/apps/lightbridge-assistant`.                                                                                                                                                                                                                                  |
| `NEXT_PUBLIC_GRAFANA_URL`                              | No               | **Has no effect set here.** Next.js inlines every `NEXT_PUBLIC_*` variable into the client bundle at `next build` time — setting it as a container env var at deploy time changes nothing. It must be an `ARG`/build-time input to the image build instead, if this ever needs wiring up.     |

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

## Branding (optional)

Disabled by default — the app renders its own built-in mark. To supply a real logo, enable
`lci.configMaps.branding-logo`/`branding-logo-light` with the base64-encoded file, enable
`lci.persistence.branding-logo`/`branding-logo-light`, and point `LCI_BRANDING_LOGO_PATH`/
`LCI_BRANDING_LOGO_LIGHT_PATH` at the mounted paths:

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
        logo.png: <base64-encoded logo>
    branding-logo-light:
      enabled: true
      binaryData:
        logo-light.png: <base64-encoded light-theme logo>
  persistence:
    branding-logo:
      enabled: true
    branding-logo-light:
      enabled: true
```

`branding-logo-light` only matters alongside `branding-logo` — set without it, no mark renders
under `black`, this app's default theme.

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

## Tracing (OpenTelemetry)

`apps/lci` exports traces as `service.name=converse-lci` (converse-frontends#443). This chart ships
three keys under `lci.controllers.main.containers.frontend.env`:

| Key                           | Chart default   | Meaning                                                                                                           |
| ----------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `''`            | **The only switch.** Blank ⇒ the app starts no SDK and logs one line saying so.                                   |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | Validated by the app — `grpc` or `http/json` makes it refuse to start rather than send a format nobody asked for. |
| `DEPLOYMENT_ENVIRONMENT`      | `''`            | `deployment.environment.name` on every span; omitted from the resource when blank.                                |

There is deliberately **no `otel.enabled` flag**. A toggle that can disagree with the endpoint is a
way to ship the feature switched off; the app treats `''` and unset identically.

`OTEL_SERVICE_NAME` and `OTEL_TRACES_SAMPLER_ARG` are **read but not defaulted here** —
`converse-lci` and `1.0` are compiled into the image, and a second copy in a values file is a second
place for them to be wrong. Set either from your own values file when you need to.

In this estate the endpoint is Grafana Alloy's OTLP/HTTP receiver:

```yaml
lci:
  controllers:
    main:
      containers:
        frontend:
          env:
            OTEL_EXPORTER_OTLP_ENDPOINT: 'http://alloy.observability.svc.cluster.local:4318'
            DEPLOYMENT_ENVIRONMENT: 'prod'
```

Alloy's own `CiliumNetworkPolicy` admits `fromEntities: cluster` on 4317/4318 and the `converse`
namespace has no egress default-deny, so no network-policy work is needed on either side. Full
contract and diagrams: [`docs/knowledge/observability.md`](../../docs/knowledge/observability.md).

> [!IMPORTANT]
> `ai-helm`'s `lci-ui` Application pins this chart with a **tilde** range (`~0.1.0`). Published
> versions are `MAJOR.MINOR` from `Chart.yaml` plus a commit-count patch, so bumping the MINOR here
> publishes a version that pin does not resolve — ArgoCD then keeps serving the last version it can
> while a values file written for the new chart is already merged. Widen the pin in `ai-helm` first,
> in its own merged change, or keep the minor where it is.
