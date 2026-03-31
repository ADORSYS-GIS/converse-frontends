# API Reference — Converse-frontends

> Source of truth: `openapi/api-key.backend.yaml` (v0.6.5), `openapi/usage.backend.yaml` (v0.6.6)
> Full schema details: see `api-usage-backend.md` (usage API) and `auth-and-identity.md` (API key schemas)

This document is a **complete endpoint index** for both LightBridge APIs consumed by the self-service frontend.

---

## Overview

| API | Base URL (runtime config) | Content-Type | Version |
|-----|--------------------------|--------------|---------|
| LightBridge AuthZ API | `EXPO_PUBLIC_BACKEND_URL` | `application/json` | v0.6.5 |
| LightBridge Usage API | `EXPO_PUBLIC_USAGE_URL` | `application/json` | v0.6.6 |

**Character encoding:** UTF-8

**Versioning:** URL path (`/api/v1/`, `/usage/v1/`)

---

## Authentication

All endpoints require a Bearer JWT token issued by Keycloak:

| Method | Header | Format |
|--------|--------|--------|
| Bearer Token (JWT) | `Authorization` | `Bearer <access_token>` |

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Obtaining a token:** See `auth-and-identity.md` — OAuth2 Authorization Code + PKCE via Keycloak.

---

## LightBridge AuthZ API Endpoints

### Accounts

| Method | Path | Operation ID | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/accounts` | `list_accounts` | List accounts (paginated: `offset`, `limit` query params required) |
| `POST` | `/api/v1/accounts` | `create_account` | Create a new account |
| `GET` | `/api/v1/accounts/{account_id}` | `get_account` | Get account by ID |
| `PATCH` | `/api/v1/accounts/{account_id}` | `update_account` | Update account fields |
| `DELETE` | `/api/v1/accounts/{account_id}` | `delete_account` | Delete account (returns 204 No Content) |

#### `GET /api/v1/accounts` — Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offset` | `integer` (int32, ≥ 0) | **Yes** | Pagination offset |
| `limit` | `integer` (int32, ≥ 0) | **Yes** | Page size |

#### `Account` Response Schema

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | Account identifier |
| `billing_identity` | `string` | No | Billing reference |
| `created_at` | `string` (date-time) | No | Creation timestamp |
| `updated_at` | `string` (date-time) | No | Last update timestamp |
| `owners_admins` | `string[]` | **Yes** | List of owner/admin user IDs |

```json
{
  "id": "acc_abc123",
  "billing_identity": "billing-ref-001",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-03-01T08:30:00Z",
  "owners_admins": ["user_xyz789"]
}
```

---

### Projects

| Method | Path | Operation ID | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/accounts/{account_id}/projects` | `list_projects` | List projects for an account (paginated) |
| `POST` | `/api/v1/accounts/{account_id}/projects` | `create_project` | Create a project under an account |
| `GET` | `/api/v1/projects/{project_id}` | `get_project` | Get project by ID |
| `PATCH` | `/api/v1/projects/{project_id}` | `update_project` | Update project fields |
| `DELETE` | `/api/v1/projects/{project_id}` | `delete_project` | Delete project (returns 204 No Content) |

#### `Project` Response Schema

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | Project identifier |
| `account_id` | `string` | No | Parent account ID |
| `name` | `string` | No | Project name |
| `billing_plan` | `string` | No | Billing plan identifier |
| `created_at` | `string` (date-time) | No | Creation timestamp |
| `updated_at` | `string` (date-time) | No | Last update timestamp |
| `allowed_models` | `string[] \| null` | **Yes** | Allowlist of model names (null = all models allowed) |
| `default_limits` | `DefaultLimits \| null` | **Yes** | Default rate limits for this project |

#### `DefaultLimits` Schema

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `concurrent_requests` | `integer \| null` | **Yes** | Max concurrent requests |
| `requests_per_day` | `integer \| null` | **Yes** | Max requests per day |
| `requests_per_second` | `integer \| null` | **Yes** | Max requests per second |

```json
{
  "id": "proj_def456",
  "account_id": "acc_abc123",
  "name": "My AI Project",
  "billing_plan": "standard",
  "created_at": "2025-02-01T09:00:00Z",
  "updated_at": "2025-03-10T12:00:00Z",
  "allowed_models": ["gpt-4o", "claude-3-5-sonnet"],
  "default_limits": {
    "concurrent_requests": 10,
    "requests_per_day": 1000,
    "requests_per_second": 5
  }
}
```

---

### API Keys

| Method | Path | Operation ID | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/projects/{project_id}/api-keys` | `list_api_keys` | List API keys for a project (paginated) |
| `POST` | `/api/v1/projects/{project_id}/api-keys` | `create_api_key` | Create a new API key — returns secret once |
| `GET` | `/api/v1/api-keys/{key_id}` | `get_api_key` | Get API key metadata by ID |
| `PATCH` | `/api/v1/api-keys/{key_id}` | `update_api_key` | Update API key name or expiry |
| `DELETE` | `/api/v1/api-keys/{key_id}` | `delete_api_key` | Delete API key (returns 204 No Content) |
| `POST` | `/api/v1/api-keys/{key_id}/revoke` | `revoke_api_key` | Revoke API key (sets status to `revoked`) |
| `POST` | `/api/v1/api-keys/{key_id}/rotate` | `rotate_api_key` | Rotate API key — returns new secret once |

#### `POST /api/v1/projects/{project_id}/api-keys` Request Body (`CreateApiKey`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Human-readable label for the key |
| `expires_at` | `string \| null` (date-time) | No | Optional expiry timestamp |

#### `ApiKeySecret` Response (creation and rotation only)

> **The `secret` field is returned ONCE and never again. Display it immediately to the user.**

```json
{
  "api_key": {
    "id": "key_ghi789",
    "project_id": "proj_def456",
    "name": "My App Key",
    "key_prefix": "lb_ghi789...",
    "status": "active",
    "created_at": "2025-03-30T10:00:00Z",
    "expires_at": null,
    "last_used_at": null,
    "last_ip": null,
    "revoked_at": null
  },
  "secret": "lb_ghi789fullsecretstringshownonce"
}
```

#### `ApiKey` Schema (all other operations)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | Key identifier |
| `project_id` | `string` | No | Owning project ID |
| `name` | `string` | No | Human-readable label |
| `key_prefix` | `string` | No | Visible prefix of the secret |
| `status` | `ApiKeyStatus` | No | `"active"` or `"revoked"` |
| `created_at` | `string` (date-time) | No | Creation timestamp |
| `expires_at` | `string \| null` (date-time) | **Yes** | Expiry timestamp |
| `last_used_at` | `string \| null` (date-time) | **Yes** | Last time key was used |
| `last_ip` | `string \| null` | **Yes** | IP address of last caller |
| `revoked_at` | `string \| null` (date-time) | **Yes** | Revocation timestamp |

#### `POST /api/v1/api-keys/{key_id}/rotate` Request Body (`RotateApiKey`)

All fields are optional:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `name` | `string \| null` | **Yes** | New name for the rotated key |
| `expires_at` | `string \| null` (date-time) | **Yes** | New expiry for the rotated key |
| `grace_period_seconds` | `integer \| null` (int64) | **Yes** | Seconds the old key remains valid after rotation |

---

## LightBridge Usage API Endpoints

| Method | Path | Operation ID | Description |
|--------|------|-------------|-------------|
| `POST` | `/usage/v1/usage/query` | `query_usage` | Query time-series usage data |

For the full request/response schema, worked examples, and enum definitions, see **`api-usage-backend.md`**.

---

## Error Codes

### AuthZ API (400 responses)
The AuthZ API does not define a structured error response schema in `api-key.backend.yaml`. Non-2xx responses should be handled as generic HTTP errors.

### Usage API (400 responses)

```json
{
  "error": "string describing the validation failure"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Validation error — `error` field contains a description |
| `401` | Missing or invalid Bearer token |
| `403` | Authenticated but not authorized for the requested resource |
| `404` | Resource not found (account, project, or API key does not exist) |
| `204` | Success — no body (DELETE operations) |
