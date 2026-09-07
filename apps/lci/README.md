# apps/lci

The Lightbridge Code Intelligence UI: a Next.js 16 app (App Router, Node runtime, `output:
'standalone'`) built on `@lightbridge/ui-web`, deployed by `charts/converse-lci` as the `lci-ui`
ArgoCD Application in the `converse` namespace.

Sibling of `apps/console` and shaped the same way on purpose — same UI package, same OIDC session
model, same container topology. Where the two differ, `apps/console/README.md` is the longer
document and the reasoning there usually applies here too.

## Shape

```
src/app/(lci)/…        repositories, runs, settings, admin — server components
src/app/api/…          OIDC login/callback/logout, the graph + symbol proxies
src/proxy.ts           Edge session gate (Next 16's replacement for middleware.ts)
src/lib/auth/…         OIDC config, JWT verification, refresh coordination
src/lib/server/…       control-plane client, admin surface, branding
src/containers/…       screen containers, including the @xyflow/react code graph
```

The browser never learns a backend origin: it talks to this app's own `/api/*` routes, which hold
the session and call the control plane server-side.

## Configuration

Plain environment variables — there is no config document. The complete reference, including which
are required and what each falls back to, is in
[`charts/converse-lci/README.md`](../../charts/converse-lci/README.md#full-environment-variable-reference).
The four a deployment cannot omit are `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `CONTROL_PLANE_URL`, and one
of `OIDC_REDIRECT_URI` / `OIDC_POST_LOGOUT_REDIRECT_URI`.

`NEXT_PUBLIC_GRAFANA_URL` is a **build-time** input — Next inlines `NEXT_PUBLIC_*` at `next build`,
so setting it as a container env var changes nothing. It is set on the `Build lci (Turbo)` step of
`.github/workflows/lci-docker-image.yml` and listed, with `NEXT_PUBLIC_BUILD_SHA`, in
`apps/lci/turbo.json`'s `build:web` `env` so a Turbo cache hit can never serve a bundle inlined
with a different value.

## Scripts

| Command                       | What it does                                                   |
| ----------------------------- | -------------------------------------------------------------- |
| `pnpm --filter lci dev`       | `next dev --turbopack` on :3001                                |
| `pnpm --filter lci build:web` | `next build --turbopack`, then the standalone scope-link fixup |
| `pnpm --filter lci start`     | `next start` on :3001 against a built `.next/`                 |
| `pnpm --filter lci test`      | `vitest run`                                                   |
| `pnpm --filter lci typecheck` | `tsc --noEmit`                                                 |

## Tracing (OpenTelemetry)

`src/instrumentation.ts` — Next's stable `register()` convention, no experimental flag on 16.3.2 —
starts a Node OTel SDK through the shared `@lightbridge/otel` package. `service.name` is
**`converse-lci`**, compiled in and overridable with `OTEL_SERVICE_NAME`.

**The environment is the only switch.** With no `OTEL_EXPORTER_OTLP_ENDPOINT` the app starts no SDK
and logs one line saying so — the ordinary state of `next dev`, `next build` and every test. Set it
and traces flow:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 \
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
DEPLOYMENT_ENVIRONMENT=local pnpm --filter lci dev
# [otel] converse-lci exporting traces to http://127.0.0.1:4318/v1/traces (…)
```

What you get: a server span per request (kubelet probes on `/robots.txt` excluded), Next's own
render/route spans nested under it, and a client span with an injected `traceparent` for every
outbound `fetch` — every control-plane call — so these traces join the backends'. The Edge runtime
(`src/proxy.ts`) is deliberately not instrumented; it reads the session cookie and redirects,
calling nothing.

Two build-time details this depends on, both silent when broken: the `@opentelemetry/*` packages are
in `next.config.mjs`'s `serverExternalPackages` (bundling them stops the HTTP patching and splits
the `@opentelemetry/api` singleton), and `build:web` runs `scripts/link-standalone-scopes.mjs`
because `output: 'standalone'` copies those packages without creating the scope symlinks Node
resolves through.

Full contract, both mermaid diagrams and the cluster wiring:
[`docs/knowledge/observability.md`](../../docs/knowledge/observability.md).

## Image

`Dockerfile` is runtime-only: `.next/standalone/` and `.next/static/` are produced on the CI runner
(`pnpm turbo run build:web --filter=lci`) and COPYed in — no install step, no build stage. The build
context must be the repo root, because the standalone bundle's `node_modules` is hoisted there.
