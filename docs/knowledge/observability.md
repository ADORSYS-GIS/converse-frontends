# Observability — Converse-frontends

> Source of truth: `openapi/usage.backend.yaml`, `apps/self-service/src/`, codebase inspection

> [!NOTE]
> This document covers what is **defined in the codebase**. No metrics, dashboards, logging infrastructure, or alerting are configured within this repository. The frontend is a static web bundle served by nginx; observability is primarily the responsibility of the LightBridge backend.

---

## SLOs & SLIs

No SLOs or SLIs are defined in this repository. The frontend is a static asset server; key user journeys (login, API key creation, usage query) depend on the availability of:

1. **Keycloak** — for authentication
2. **LightBridge AuthZ API** — for account/project/API key operations
3. **LightBridge Usage API** — for usage data

If SLOs are defined for this frontend, they should target:

| User Journey | Indicator | Target (Not Defined) |
|--------------|-----------|----------------------|
| Page load | Time to first meaningful paint | Not defined in codebase |
| Login flow | OAuth2 redirect → token success rate | Not defined in codebase |
| API key creation | `POST /api/v1/projects/{id}/api-keys` success rate | Not defined in codebase |
| Usage query | `POST /usage/v1/usage/query` success rate | Not defined in codebase |

---

## Metrics

### Frontend

No frontend metrics infrastructure (Prometheus, OpenTelemetry browser SDK, etc.) is configured in this repository.

### LightBridge Backend (via OTEL ingest)

The LightBridge Usage backend (`usage.backend.yaml`) defines **two OTEL ingest endpoints** for receiving telemetry from the AI gateway:

| Endpoint | Method | Content-Type | Description |
|----------|--------|-------------|-------------|
| `/v1/otel/metrics` | `POST` | `application/x-protobuf` | Ingest OTEL metrics (LLM usage metrics) |
| `/v1/otel/traces` | `POST` | `application/x-protobuf` | Ingest OTEL traces |

Both return `202 Accepted` with an `IngestResponse`:

```json
{
  "accepted_events": 42
}
```

These endpoints are called by the **Converse AI gateway** (not by this frontend). The ingested data becomes queryable via `POST /usage/v1/usage/query`.

---

## Logging

### nginx (runtime)
- nginx access and error logs are written to stdout/stderr (Docker convention)
- No structured logging format is configured in `.docker/nginx/default.conf` beyond nginx defaults
- Logs are collected by the Kubernetes node logging agent (infrastructure responsibility, not defined here)

### Frontend app (browser)
- No browser logging library (e.g., Sentry, Datadog RUM) is configured in the codebase
- Error handling follows the `AGENTS.md` principle: fail fast in development, gracefully in production

---

## Tracing

No distributed tracing (OpenTelemetry browser SDK, Jaeger, Zipkin) is configured for the frontend.

The LightBridge backend ingests traces from the AI gateway via `/v1/otel/traces` (protobuf). This is a backend-to-backend concern; the frontend is not involved in trace propagation.

---

## Dashboards

No dashboards are defined or linked in this repository.

---

## Alerts

No alert policies are defined in this repository.

If implementing alerts, consider:

| Signal | Suggested Threshold | Where to Alert |
|--------|--------------------|----|
| nginx HTTP 5xx rate | > 1% over 5 min | PagerDuty / Slack |
| Pod restart count | > 2 in 10 min | PagerDuty |
| Memory usage | > 200 Mi (limit: 256Mi) | Slack warning |
| Container not ready | Readiness probe failing | PagerDuty |
