# API Reference — Converse-frontends

> Source of truth: `packages/authz-rpc/schema/authz.cstack` (AuthZ API), `openapi/usage.backend.yaml` (v0.6.6, Usage API)
> Full schema details: see `api-usage-backend.md` (usage API) and `auth-and-identity.md` (API key schemas)

This document is a **complete endpoint index** for both LightBridge APIs consumed by the self-service frontend.
The two APIs use different transports — AuthZ moved to cratestack RPC (ADR-0003 in `lightbridge-authz`),
Usage stays plain REST/OpenAPI.

---

## Overview

| API                   | Base URL (runtime config) | Transport                 | Content-Type                                             |
| --------------------- | ------------------------- | ------------------------- | -------------------------------------------------------- |
| LightBridge AuthZ API | `EXPO_PUBLIC_BACKEND_URL` | RPC (`POST /rpc/{op_id}`) | `application/json` (dev/CI) or `application/cbor` (prod) |
| LightBridge Usage API | `EXPO_PUBLIC_USAGE_URL`   | REST                      | `application/json`                                       |

**Character encoding:** UTF-8

**Versioning:** the AuthZ API has no URL-path version — its contract is the `authz.cstack` schema
file itself (versioned via the file, not a URL segment). The Usage API keeps URL-path versioning
(`/usage/v1/`).

---

## Authentication

All endpoints require a Bearer JWT token issued by Keycloak:

| Method             | Header          | Format                  |
| ------------------ | --------------- | ----------------------- |
| Bearer Token (JWT) | `Authorization` | `Bearer <access_token>` |

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Obtaining a token:** See `auth-and-identity.md` — OAuth2 Authorization Code + PKCE via Keycloak.

---

## LightBridge AuthZ API Endpoints

Every call is `POST /rpc/{op_id}` — the op-id (a dotted string like `model.Account.list` or
`procedure.createApiKey`) is the dispatch key, carried in the URL path, not the HTTP verb or a
REST-shaped path. There is no per-resource URL structure to document; instead, each op-id below
takes a JSON (or CBOR, in prod) request body. `get`/`update`/`delete`/`create`/`procedure.*` return
the raw result object directly — no envelope. **`list` is the one exception**: every model
declares `@@paged` in the schema, so `model.<X>.list` returns a `Page<X>` envelope
(`{ items: X[], pageInfo?: { limit, offset, hasNext, nextOffset, total } }`), not a bare array —
callers must read `.items`. The generated client (`packages/authz-rpc/generated/src/client.ts`)
exposes this as a client-object API — `client.accounts`/`client.projects`/`client.apiKeys` (each
with `list`/`get`/`update`/`delete`, plus `create` only where reachable — see below) and
`client.procedures` (one method per procedure, e.g. `client.procedures.createApiKey({ args })`) —
rather than free-standing functions.

**Reachability is schema-driven, not uniform.** A model only gets a generic `create`/`update`/
`delete`/`list`/`get` op-id if the schema declares a matching `@@allow("<verb>", ...)` for it — a
missing `@@allow("create", ...)` means that verb doesn't exist at all (fail-closed by policy), and
creation goes through a dedicated procedure instead. This is why `Account` and `ApiKey` have no
generic `create`, but `Project` does.

### Request envelope shapes

| Op-id shape                          | Request body                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.<X>.list`                     | `{ limit?, offset?, fields?, include?, includeFields?, sort?, where?, or?, filters?: [{ key, value }] }` — every field optional; `filters` carries equality predicates (e.g. `{ key: "accountId", value: "acc_123" }` to scope a list) |
| `model.<X>.get` / `model.<X>.delete` | `{ id }`                                                                                                                                                                                                                               |
| `model.<X>.update`                   | `{ id, patch: {...} }` — `patch` is a partial `Update<X>Input`                                                                                                                                                                         |
| `model.<X>.create`                   | the `Create<X>Input` struct directly (no wrapper)                                                                                                                                                                                      |
| `procedure.<name>`                   | `{ args: {...} }`                                                                                                                                                                                                                      |

### Accounts

| Op-id                                                          | Description                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.Account.list`                                           | List accounts the caller is a member of (list input above; no explicit account-scoping filter needed — membership already scopes the result)                                                                                                                                                    |
| `model.Account.get`                                            | Get account by ID (`{ id }`)                                                                                                                                                                                                                                                                    |
| `model.Account.update`                                         | Update account fields (`{ id, patch: UpdateAccountInput }`)                                                                                                                                                                                                                                     |
| `model.Account.delete`                                         | Delete account                                                                                                                                                                                                                                                                                  |
| `procedure.createAccount`                                      | Create an account — **the only way to create one.** There is no `model.Account.create`: the generic verb would insert only the `accounts` row without seeding the creator's membership, locking them out of every membership-scoped policy check. `createAccount` does both in one transaction. |
| `procedure.disableAccount` / `procedure.enableAccount`         | Suspend/restore an account (`{ args: { accountId } }`)                                                                                                                                                                                                                                          |
| `procedure.addAccountMember` / `procedure.removeAccountMember` | Manage membership (`{ args: { accountId, subject } }`)                                                                                                                                                                                                                                          |

#### `Account` Response Schema

| Field             | Type                 | Description                 |
| ----------------- | -------------------- | --------------------------- |
| `id`              | `string`             | Account identifier          |
| `billingIdentity` | `string`             | Billing reference           |
| `status`          | `string`             | `"active"` or `"suspended"` |
| `createdAt`       | `string` (date-time) | Creation timestamp          |
| `updatedAt`       | `string` (date-time) | Last update timestamp       |

```json
{
  "id": "acc_abc123",
  "billingIdentity": "billing-ref-001",
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-03-01T08:30:00Z"
}
```

Note: unlike the pre-migration REST response, there is **no `owners_admins` field** — the schema
doesn't expose a members list on `Account` at all (`AccountMembership` is read-self-only, with no
listing op-id). See the account-settings members UI for the resulting known gap.

---

### Projects

| Op-id                                                  | Description                                                                                                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.Project.list`                                   | List projects (scope to an account via `filters: [{ key: "accountId", value }]`)                                                                                                    |
| `model.Project.get`                                    | Get project by ID                                                                                                                                                                   |
| `model.Project.create`                                 | Create a project — reachable directly (unlike Account/ApiKey). The **caller generates the id** (`cuid2`, client-side) and must supply `defaultLimits` (required, even if just `{}`) |
| `model.Project.update`                                 | Update project fields                                                                                                                                                               |
| `model.Project.delete`                                 | Delete project                                                                                                                                                                      |
| `procedure.disableProject` / `procedure.enableProject` | Suspend/restore a project (`{ args: { projectId } }`)                                                                                                                               |

#### `Project` Response Schema

| Field           | Type                     | Nullable | Description                                                                                                               |
| --------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                 | No       | Project identifier                                                                                                        |
| `accountId`     | `string`                 | No       | Parent account ID                                                                                                         |
| `name`          | `string`                 | No       | Project name                                                                                                              |
| `billingPlan`   | `string`                 | No       | Billing plan identifier                                                                                                   |
| `status`        | `string`                 | No       | `"active"` or `"suspended"`                                                                                               |
| `createdAt`     | `string` (date-time)     | No       | Creation timestamp                                                                                                        |
| `updatedAt`     | `string` (date-time)     | No       | Last update timestamp                                                                                                     |
| `allowedModels` | `JsonValue \| undefined` | **Yes**  | Allowlist of model names (absent = all models allowed)                                                                    |
| `defaultLimits` | `JsonValue`              | No       | Default rate limits for this project (opaque JSON blob, e.g. `{ requestsPerSecond, requestsPerDay, concurrentRequests }`) |

`allowedModels`/`defaultLimits` are cratestack `Json` columns: on the wire they're externally
tagged (`{}` → `{"Map": {}}`, `["x"]` → `{"List": [{"String": "x"}]}`), but
`packages/authz-rpc`'s `tagValue`/`untagValue` (`src/value.ts`) convert transparently at the SDK
boundary — hooks/views never see the tagged form, just plain JS values typed `JsonValue`.

```json
{
  "id": "proj_def456",
  "accountId": "acc_abc123",
  "name": "My AI Project",
  "billingPlan": "standard",
  "status": "active",
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-03-10T12:00:00Z",
  "allowedModels": ["gpt-4o", "claude-3-5-sonnet"],
  "defaultLimits": {
    "concurrentRequests": 10,
    "requestsPerDay": 1000,
    "requestsPerSecond": 5
  }
}
```

---

### API Keys

| Op-id                    | Description                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.ApiKey.list`      | List API keys (scope to a project via `filters: [{ key: "projectId", value }]`)                                                                                                                                                                                                 |
| `model.ApiKey.get`       | Get API key metadata by ID                                                                                                                                                                                                                                                      |
| `model.ApiKey.update`    | Update **only** `name`/`expiresAt` — every other field is `@readonly` (schema-enforced)                                                                                                                                                                                         |
| `model.ApiKey.delete`    | Soft-delete (sets `deletedAt`, `@@soft_delete` in the schema — every generated read excludes soft-deleted rows automatically)                                                                                                                                                   |
| `procedure.createApiKey` | Create a new API key — returns the secret once. No `model.ApiKey.create`: the server must generate the id, hash the secret, and validate the billing plan, none of which a caller may supply directly                                                                           |
| `procedure.revokeApiKey` | Revoke (`{ args: { keyId } }`) — sets `status: "revoked"`                                                                                                                                                                                                                       |
| `procedure.rotateApiKey` | Rotate — returns a new secret. **Capability change from the pre-migration REST API**: the old `RotateApiKey` body accepted optional `name`/`expiresAt`/`gracePeriodSeconds` overrides; the new `RotateApiKeyInput` is just `{ keyId }` — no override fields exist in the schema |

#### `procedure.createApiKey` Request (`CreateApiKeyInput`)

| Field         | Type                              | Required | Description                          |
| ------------- | --------------------------------- | -------- | ------------------------------------ |
| `projectId`   | `string`                          | **Yes**  | Project the key belongs to           |
| `name`        | `string`                          | **Yes**  | Human-readable label for the key     |
| `expiresAt`   | `string \| undefined` (date-time) | No       | Optional expiry timestamp            |
| `billingPlan` | `string`                          | **Yes**  | Billing plan to create the key under |

#### `ApiKeySecret` Response (creation and rotation only)

> **The `secret` field is returned ONCE and never again. Display it immediately to the user.**

Unlike the pre-migration REST response, this is **flat** — not nested under an `api_key` key (see
`auth-and-identity.md` for why):

```json
{
  "id": "key_ghi789",
  "projectId": "proj_def456",
  "name": "My App Key",
  "keyPrefix": "lb_ghi789...",
  "status": "active",
  "billingPlan": "standard",
  "createdAt": "2025-03-30T10:00:00Z",
  "updatedAt": "2025-03-30T10:00:00Z",
  "secret": "lb_ghi789fullsecretstringshownonce",
  "oauth2Url": null
}
```

#### `ApiKey` Schema (all other operations)

| Field         | Type                              | Nullable | Description                            |
| ------------- | --------------------------------- | -------- | -------------------------------------- |
| `id`          | `string`                          | No       | Key identifier                         |
| `projectId`   | `string`                          | No       | Owning project ID                      |
| `name`        | `string`                          | No       | Human-readable label                   |
| `keyPrefix`   | `string`                          | No       | Visible prefix of the secret           |
| `status`      | `string`                          | No       | `"active"` or `"revoked"`              |
| `billingPlan` | `string`                          | No       | Billing plan the key was created under |
| `createdAt`   | `string` (date-time)              | No       | Creation timestamp                     |
| `updatedAt`   | `string` (date-time)              | No       | Last update timestamp                  |
| `expiresAt`   | `string \| undefined` (date-time) | **Yes**  | Expiry timestamp                       |
| `lastUsedAt`  | `string \| undefined` (date-time) | **Yes**  | Last time key was used                 |
| `lastIp`      | `string \| undefined`             | **Yes**  | IP address of last caller              |
| `revokedAt`   | `string \| undefined` (date-time) | **Yes**  | Revocation timestamp                   |
| `deletedAt`   | `string \| undefined` (date-time) | **Yes**  | Soft-delete timestamp                  |

`keyHash` exists in the schema but is `@server_only` — it's never emitted on the wire and has no
place in this table at all, on any operation.

---

## LightBridge Usage API Endpoints

| Method | Path                    | Operation ID  | Description                  |
| ------ | ----------------------- | ------------- | ---------------------------- |
| `POST` | `/usage/v1/usage/query` | `query_usage` | Query time-series usage data |

For the full request/response schema, worked examples, and enum definitions, see **`api-usage-backend.md`**.

---

## Error Codes

### AuthZ API

Two distinct error body shapes exist, depending on which layer rejects the request
(`packages/authz-rpc/src/transport.ts` handles both):

1. **The app's own RBAC gate** (runs before the RPC dispatcher, denies unmapped/policy-forbidden
   op-ids — e.g. `model.Account.create`, `model.ApiKey.create`, `/rpc/batch`, all denied
   unconditionally):
   ```json
   { "error": "string describing why the call was denied" }
   ```
2. **cratestack's own `RpcErrorBody`** (dispatcher-level errors — bad input, not-found, handler
   errors):
   ```json
   { "code": "not_found", "message": "string", "details": null }
   ```

| HTTP Status | Meaning                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `400`       | Invalid argument — malformed op-id body                                           |
| `401`       | Missing or invalid Bearer token                                                   |
| `403`       | Authenticated but not authorized (RBAC gate, or a schema `@@allow` policy denial) |
| `404`       | Resource not found (account, project, or API key does not exist)                  |

### Usage API (400 responses)

```json
{
  "error": "string describing the validation failure"
}
```

| HTTP Status | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| `400`       | Validation error — `error` field contains a description          |
| `401`       | Missing or invalid Bearer token                                  |
| `403`       | Authenticated but not authorized for the requested resource      |
| `404`       | Resource not found (account, project, or API key does not exist) |
| `204`       | Success — no body (DELETE operations)                            |
