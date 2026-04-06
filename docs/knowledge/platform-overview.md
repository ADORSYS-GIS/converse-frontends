# Platform Overview

## What is Converse?

Converse is an **AI gateway platform** that routes and proxies requests to large language model (LLM) providers. It exposes a unified HTTP API endpoint that external AI clients call to access AI models.

- **AI Gateway base URL:** `api.ai.camer.digital/v1`

---

## What is LightBridge?

LightBridge is a **separate service layer** built on top of the Converse AI gateway. It provides:

1. **API Key management** — issuance, rotation, and revocation of API keys that external AI clients use to authenticate with the gateway.
2. **Usage visibility** — a usage query API that returns time-series metrics (token counts, request counts, cost) scoped to a user, project, or account.

LightBridge is implemented as a **Rust service backed by a PostgreSQL database**. It exposes two distinct APIs:

| API | OpenAPI Spec | Purpose |
|-----|-------------|---------|
| LightBridge AuthZ API | `openapi/api-key.backend.yaml` | Account, project, and API key management |
| LightBridge Usage API | `openapi/usage.backend.yaml` | Time-series usage queries |

---

## Role of This Frontend

This repository (`converse-frontends`) contains the **LightBridge self-service frontend**, deployed at:

- **Frontend URL:** `self-service.ai.camer.digital`

> **IMPORTANT:** This frontend is the UI for LightBridge only. It is NOT the AI gateway itself, and it does NOT proxy or forward LLM requests.

What this frontend provides:
- A self-service portal for users to manage their **accounts**, **projects**, and **API keys** (via LightBridge AuthZ API)
- A **usage dashboard** to view token consumption and request metrics (via LightBridge Usage API)
- Authentication via **Keycloak** using OAuth2/PKCE

What this frontend does NOT do:
- Process or forward LLM requests
- Serve as the AI gateway endpoint
- Store or manage model configurations

---

## Deployment Topology

```
┌──────────────────────────────────┐
│  User's Browser / Mobile App     │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  LightBridge Self-Service UI     │  https://self-service.ai.camer.digital
│  (this repo — React / Expo)      │
└────────────┬─────────────────────┘
             │  Bearer token (JWT from Keycloak)
             ▼
┌──────────────────────────────────┐
│  LightBridge Backend             │  Rust service + PostgreSQL
│  AuthZ API  |  Usage API         │
└────────────┬─────────────────────┘
             │  API Key issued to external client
             ▼
┌──────────────────────────────────┐
│  Converse AI Gateway             │  https://api.ai.camer.digital/v1
│  (LLM proxy — NOT this repo)     │
└──────────────────────────────────┘
```

---

## Interaction Flow

### User managing API keys
1. User logs in to the self-service UI at `self-service.ai.camer.digital` via Keycloak (OAuth2/PKCE).
2. Frontend receives a **Bearer token** (JWT) from Keycloak.
3. Frontend sends authenticated requests to the **LightBridge AuthZ API** (e.g., to create or revoke an API key).
4. LightBridge backend stores the API key in PostgreSQL and returns the key secret to the frontend.
5. User copies the API key secret and configures their **external AI client** with it.
6. The external AI client uses that API key to call the **Converse AI Gateway** directly.

### User viewing usage
1. Authenticated user navigates to the Usage tab in the self-service UI.
2. Frontend calls `POST /usage/v1/usage/query` on the LightBridge Usage API with a Bearer token.
3. LightBridge returns time-series usage data (`UsageSeriesPoint[]`).
4. Frontend displays token counts, request counts, and cost metrics.

---

## Key Distinction

| Bearer Token | API Key |
|---|---|
| Issued by Keycloak to the logged-in user | Issued by LightBridge backend to an account/project |
| Used by this frontend to authenticate with LightBridge | Used by external AI clients to authenticate with the Converse AI gateway |
| Short-lived JWT; refreshed via OAuth2 token endpoint | Long-lived; can be rotated or revoked via the frontend |
| Never used to call the AI gateway directly | Never used by this frontend |
