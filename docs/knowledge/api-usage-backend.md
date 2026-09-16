# API: LightBridge Usage Backend

> Source of truth: `openapi/usage.backend.yaml` (version `0.8.1`)
> Service name: `lightbridge-authz-usage-rest`

This document covers the **usage query API** only. The OTEL ingest endpoints (`/v1/otel/metrics`, `/v1/otel/traces`) are internal infrastructure endpoints and are not called by the self-service frontend.

---

## Authentication

All endpoints require a **Bearer JWT token** obtained via Keycloak.

```
Authorization: Bearer <access_token>
```

---

## Endpoint: Query Usage

```
POST /usage/v1/usage/query
Content-Type: application/json
```

Queries time-series usage data for a given scope (user, API key, project, account, or the whole estate) over a specified time window.

### Request Body: `UsageQueryRequest`

| Field        | Type                             | Required | Description                                                                                                                                                                                                             |
| ------------ | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`      | `UsageScope` (enum)              | **Yes**  | The scope to query: `"user"`, `"api_key"`, `"project"`, `"account"`, or `"all"`                                                                                                                                         |
| `scope_id`   | `string`                         | **Yes**  | The ID value for `scope`. Required as a wire field for every scope, but **ignored** for `scope: "all"` (send `""`). For `scope: "user"`, must equal the caller's own validated token subject or the request is refused. |
| `start_time` | `string` (date-time)             | **Yes**  | Start of the time window (ISO 8601 UTC, e.g. `"2025-03-01T00:00:00Z"`)                                                                                                                                                  |
| `end_time`   | `string` (date-time)             | **Yes**  | End of the time window (ISO 8601 UTC)                                                                                                                                                                                   |
| `bucket`     | `string`                         | No       | Time bucket size for aggregation (e.g. `"1 day"`, `"1 hour"`). The frontend defaults to `"1 day"`                                                                                                                       |
| `filters`    | `UsageQueryFilters` (object)     | No       | Narrow results by specific dimensions. All fields nullable/optional                                                                                                                                                     |
| `group_by`   | `UsageGroupBy[]` (array of enum) | No       | Group results by one or more dimensions                                                                                                                                                                                 |
| `limit`      | `integer` (int32, ≥ 0)           | No       | Maximum number of **buckets** to return (see `truncated` below — this bounds distinct `bucket_start` values, not `points.length`)                                                                                       |

### `UsageQueryFilters` Object

All fields in this object are **optional** and **nullable**:

| Field          | Type                       | Description                                                                                                                                                                       |
| -------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account_id`   | `string \| null`           | Filter to a specific account                                                                                                                                                      |
| `project_id`   | `string \| null`           | Filter to a specific project                                                                                                                                                      |
| `user_id`      | `string \| null`           | Filter to a specific user                                                                                                                                                         |
| `user_name`    | `string \| null`           | Filter to a specific user display name                                                                                                                                            |
| `api_key_id`   | `string \| null`           | Filter to a specific API key                                                                                                                                                      |
| `model`        | `string \| null`           | Filter to a specific model name                                                                                                                                                   |
| `metric_name`  | `string \| null`           | Filter to a specific metric                                                                                                                                                       |
| `signal_type`  | `string \| null`           | Filter to a specific signal type                                                                                                                                                  |
| `azp`          | `string \| null`           | Equality filter on the OAuth client (`azp`) the request arrived on                                                                                                                |
| `billing_plan` | `string \| null`           | Equality filter on the billing plan Authorino stamped on the request                                                                                                              |
| `operation`    | `UsageOperation \| null`   | Equality filter on which API surface was called. For "any of several operations," use `operation_in` instead of issuing one query per value                                       |
| `operation_in` | `UsageOperation[] \| null` | Set-membership filter on `operation` (min 1 item). An unknown enum value is a `400`; an empty array is refused too (it can never match any row). Combines with `operation` by AND |

### `UsageOperation` Enum

The closed vocabulary for the `operation` dimension:

| Value                | Meaning                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"chat_completions"` | Request path matched the chat-completions surface                                                                                                                 |
| `"responses"`        | Request path matched the responses surface                                                                                                                        |
| `"messages"`         | Request path matched the messages surface                                                                                                                         |
| `"embeddings"`       | Request path matched the embeddings surface                                                                                                                       |
| `"other"`            | Request carried a path, but not one of the four surfaces above — a real, storable value, distinct from `null` (which means the signal carried no path key at all) |

---

### Response: `UsageQueryResponse`

```json
{
  "points": [/* UsageSeriesPoint[] */],
  "truncated": false
}
```

| Field       | Type                 | Required | Description                                                                                                                                                                                                                                                                                                                                     |
| ----------- | -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `points`    | `UsageSeriesPoint[]` | **Yes**  | Array of time-series data points. May be empty if no data exists for the window                                                                                                                                                                                                                                                                 |
| `truncated` | `boolean`            | **Yes**  | `true` when more than `limit` distinct `bucket_start` values matched and the oldest bucket was dropped whole to fit. `limit` bounds the **bucket** count, not `points.length` — with a non-empty `group_by`, `points` can hold more entries than `limit` (one per series per surviving bucket). `false` means every matching bucket is present. |

---

### Response Item: `UsageSeriesPoint`

Each element in the `points` array has the following shape:

| Field               | Type                      | Nullable | Description                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bucket_start`      | `string` (date-time)      | No       | Start timestamp of this time bucket (ISO 8601 UTC)                                                                                                                                                                                                             |
| `requests`          | `integer` (int64)         | No       | Number of API requests in this bucket                                                                                                                                                                                                                          |
| `usage_value`       | `number` (double)         | No       | Cost/usage value for this bucket (unit defined by metric)                                                                                                                                                                                                      |
| `total_cost`        | `number \| null` (double) | **Yes**  | Total cost in **micro-USD** for this bucket. **`null` when no `usage_events` row matched the bucket — never collapsed to `0`**, because "cost unknown" and "cost was zero" are different facts (lightbridge-authz#729, converse-frontends#532/#533)            |
| `prompt_tokens`     | `integer` (int64)         | No       | Total prompt tokens consumed in this bucket                                                                                                                                                                                                                    |
| `completion_tokens` | `integer` (int64)         | No       | Total completion tokens generated in this bucket                                                                                                                                                                                                               |
| `total_tokens`      | `integer` (int64)         | No       | Sum of `prompt_tokens` + `completion_tokens`                                                                                                                                                                                                                   |
| `latency_samples`   | `integer` (int64)         | No       | How many events in this bucket actually carried a latency measurement. `0` means no event in this bucket reported latency — a legitimate outcome (aggregate histogram/summary signals carry a bucketed distribution rather than one observation), not an error |
| `latency_p50_ms`    | `number \| null` (double) | **Yes**  | Median request latency in milliseconds. **`null` exactly when `latency_samples` is `0`** — never collapsed to `0`, because "no latency was reported" and "every request took 0 ms" are different facts                                                         |
| `latency_p95_ms`    | `number \| null` (double) | **Yes**  | 95th-percentile request latency in milliseconds. `null` when `latency_samples` is `0`                                                                                                                                                                          |
| `latency_p99_ms`    | `number \| null` (double) | **Yes**  | 99th-percentile request latency in milliseconds. `null` when `latency_samples` is `0`, and meaningful only once `latency_samples` is large (~100+); below that it degenerates toward the bucket maximum                                                        |
| `account_id`        | `string \| null`          | **Yes**  | Account ID (populated when `group_by` includes `account_id`)                                                                                                                                                                                                   |
| `project_id`        | `string \| null`          | **Yes**  | Project ID (populated when `group_by` includes `project_id`)                                                                                                                                                                                                   |
| `user_id`           | `string \| null`          | **Yes**  | User ID (populated when `group_by` includes `user_id`)                                                                                                                                                                                                         |
| `user_name`         | `string \| null`          | **Yes**  | User display name (populated when `group_by` includes `user_name`)                                                                                                                                                                                             |
| `api_key_id`        | `string \| null`          | **Yes**  | API key ID (populated when `group_by` includes `api_key_id`)                                                                                                                                                                                                   |
| `model`             | `string \| null`          | **Yes**  | Model name (populated when `group_by` includes `model`)                                                                                                                                                                                                        |
| `metric_name`       | `string \| null`          | **Yes**  | Metric name (populated when `group_by` includes `metric_name`)                                                                                                                                                                                                 |
| `signal_type`       | `string \| null`          | **Yes**  | Signal type (populated when `group_by` includes `signal_type`)                                                                                                                                                                                                 |
| `azp`               | `string \| null`          | **Yes**  | The OAuth client the requests in this bucket arrived on (populated when `group_by` includes `azp`)                                                                                                                                                             |
| `billing_plan`      | `string \| null`          | **Yes**  | The billing plan stamped on the requests in this bucket (populated when `group_by` includes `billing_plan`)                                                                                                                                                    |
| `operation`         | `UsageOperation \| null`  | **Yes**  | Which API surface was called (populated when `group_by` includes `operation`). A `null` here **while grouped by `operation`** is itself a real value: those rows carried no request path at all — it is not the same as `"other"`                              |

**Nullability at a glance:**

- **Always non-null:** `bucket_start`, `requests`, `usage_value`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `latency_samples`.
- **Null only to mean "no data matched," never collapsed to `0`:** `total_cost`, `latency_p50_ms`, `latency_p95_ms`, `latency_p99_ms`.
- **Null unless the matching dimension is in `group_by`, in which case it echoes that dimension's value (which may itself legitimately be `null`, e.g. `operation`):** `account_id`, `project_id`, `user_id`, `user_name`, `api_key_id`, `model`, `metric_name`, `signal_type`, `azp`, `billing_plan`, `operation`.

---

### Error Response: `UsageErrorResponse`

HTTP `400`:

```json
{
  "error": "string describing the validation failure"
}
```

| Field   | Type     | Required |
| ------- | -------- | -------- |
| `error` | `string` | **Yes**  |

---

## Enums

### `UsageScope`

Controls what entity the `scope_id` refers to, and doubles as its own authorization rule (lightbridge-authz#605/#648):

| Value       | Meaning                                                                                                                     | Authorization                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `"user"`    | Query usage for a single user identified by `scope_id`                                                                      | `scope_id` must equal the caller's own validated token subject (self-ownership, checked from the token directly)            |
| `"api_key"` | Query usage for a single API key identified by `scope_id`                                                                   | **No resolvable ownership authority exists — refused unconditionally, for every caller**, even one holding `usage:read-all` |
| `"project"` | Query usage for an entire project identified by `scope_id`                                                                  | Caller must own the project's account, or hold a roster-member row for it (`authz-opa`'s `authorize_usage_scope`)           |
| `"account"` | Query usage for an entire account (all projects within it) identified by `scope_id`                                         | Caller must own the account                                                                                                 |
| `"all"`     | Estate-wide — no `account_id`/`project_id`/`user_id`/`api_key_id` filter is added at all. `scope_id` is ignored (send `""`) | Requires the `usage:read-all` permission (granted to `lightbridge-admin` by default)                                        |

A token holding `usage:read-all` may additionally read **any** `scope_id` under `user`/`project`/`account` (the ownership round trip is skipped) — that permission already returns every row in the estate via `scope: "all"`, so a per-account/per-project/per-user slice of it is not a wider grant. `api_key` stays refused regardless of permissions.

### `UsageGroupBy`

Dimensions by which response points can be broken down. Pass as an array in `group_by`:

| Value            | Practical meaning                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `"account_id"`   | Break results down per account. Useful for account-level queries with multiple sub-accounts                |
| `"project_id"`   | Break results down per project. Useful for understanding which project drives the most usage               |
| `"api_key_id"`   | Break results down per API key                                                                             |
| `"user_id"`      | Break results down per user. Useful for identifying heavy consumers within a project                       |
| `"user_name"`    | Break results down per user display name                                                                   |
| `"model"`        | Break results down per LLM model name. Useful for understanding cost by model                              |
| `"metric_name"`  | Break results down per metric type                                                                         |
| `"signal_type"`  | Break results down per signal type (e.g. distinguishing traces from metrics)                               |
| `"azp"`          | Break results down per OAuth client that requests arrived on                                               |
| `"operation"`    | Break results down per API surface called (`chat_completions`/`responses`/`messages`/`embeddings`/`other`) |
| `"billing_plan"` | Break results down per billing plan Authorino stamped on the request                                       |

`azp`, `operation`, and `billing_plan` are bridge columns lightbridge-authz#648 added to `usage_events` (PR #652).

---

## Worked Examples

### Example 1: Total cost for last 30 days (project scope)

This is the default query issued by `useQueryUsage` in `packages/hooks/src/usage.ts` when no custom params are provided.

**Request:**

```json
{
  "scope": "project",
  "scope_id": "proj_abc123",
  "start_time": "2025-02-28T00:00:00Z",
  "end_time": "2025-03-30T00:00:00Z",
  "bucket": "1 day"
}
```

**Response:**

```json
{
  "points": [
    {
      "bucket_start": "2025-02-28T00:00:00Z",
      "requests": 142,
      "usage_value": 0.28,
      "total_cost": 280000,
      "prompt_tokens": 18500,
      "completion_tokens": 4200,
      "total_tokens": 22700,
      "latency_samples": 142,
      "latency_p50_ms": 412.5,
      "latency_p95_ms": 980.2,
      "latency_p99_ms": 1523.0,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "user_name": null,
      "api_key_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null,
      "azp": null,
      "billing_plan": null,
      "operation": null
    },
    {
      "bucket_start": "2025-03-01T00:00:00Z",
      "requests": 0,
      "usage_value": 0,
      "total_cost": null,
      "prompt_tokens": 0,
      "completion_tokens": 0,
      "total_tokens": 0,
      "latency_samples": 0,
      "latency_p50_ms": null,
      "latency_p95_ms": null,
      "latency_p99_ms": null,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "user_name": null,
      "api_key_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null,
      "azp": null,
      "billing_plan": null,
      "operation": null
    }
  ],
  "truncated": false
}
```

> The second bucket illustrates the honesty rule: a bucket with no matching `usage_events` row reports `total_cost`/`latency_p*_ms` as `null`, not `0`, even though `requests`/`usage_value`/token counts are legitimately `0`.

---

### Example 2: Usage grouped by model (last 30 days, project scope)

**Request:**

```json
{
  "scope": "project",
  "scope_id": "proj_abc123",
  "start_time": "2025-02-28T00:00:00Z",
  "end_time": "2025-03-30T00:00:00Z",
  "bucket": "1 day",
  "group_by": ["model"]
}
```

**Response:**

```json
{
  "points": [
    {
      "bucket_start": "2025-03-01T00:00:00Z",
      "requests": 100,
      "usage_value": 0.2,
      "total_cost": 200000,
      "prompt_tokens": 12000,
      "completion_tokens": 3000,
      "total_tokens": 15000,
      "latency_samples": 100,
      "latency_p50_ms": 388.0,
      "latency_p95_ms": 910.4,
      "latency_p99_ms": 1340.1,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "user_name": null,
      "api_key_id": null,
      "model": "gpt-4o",
      "metric_name": null,
      "signal_type": null,
      "azp": null,
      "billing_plan": null,
      "operation": null
    },
    {
      "bucket_start": "2025-03-01T00:00:00Z",
      "requests": 109,
      "usage_value": 0.21,
      "total_cost": 210000,
      "prompt_tokens": 15300,
      "completion_tokens": 3100,
      "total_tokens": 18400,
      "latency_samples": 109,
      "latency_p50_ms": 401.7,
      "latency_p95_ms": 955.9,
      "latency_p99_ms": 1489.6,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "user_name": null,
      "api_key_id": null,
      "model": "claude-3-5-sonnet",
      "metric_name": null,
      "signal_type": null,
      "azp": null,
      "billing_plan": null,
      "operation": null
    }
  ],
  "truncated": false
}
```

---

### Example 3: Time series — requests per day (user scope)

**Request:**

```json
{
  "scope": "user",
  "scope_id": "user_xyz789",
  "start_time": "2025-03-01T00:00:00Z",
  "end_time": "2025-03-07T00:00:00Z",
  "bucket": "1 day",
  "limit": 7
}
```

**Response:**

```json
{
  "points": [
    {
      "bucket_start": "2025-03-01T00:00:00Z",
      "requests": 45,
      "usage_value": 0.09,
      "total_cost": 90000,
      "prompt_tokens": 5800,
      "completion_tokens": 1400,
      "total_tokens": 7200,
      "latency_samples": 45,
      "latency_p50_ms": 355.2,
      "latency_p95_ms": 812.6,
      "latency_p99_ms": 1190.3,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "user_name": null,
      "api_key_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null,
      "azp": null,
      "billing_plan": null,
      "operation": null
    },
    {
      "bucket_start": "2025-03-02T00:00:00Z",
      "requests": 62,
      "usage_value": 0.12,
      "total_cost": 120000,
      "prompt_tokens": 7900,
      "completion_tokens": 1900,
      "total_tokens": 9800,
      "latency_samples": 62,
      "latency_p50_ms": 368.9,
      "latency_p95_ms": 845.1,
      "latency_p99_ms": 1225.7,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "user_name": null,
      "api_key_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null,
      "azp": null,
      "billing_plan": null,
      "operation": null
    }
  ],
  "truncated": false
}
```

---

## Frontend Integration

The hook `useQueryUsage` in `packages/hooks/src/usage.ts` wraps this endpoint:

- Defaults: `scope = "project"`, `scope_id` = current project ID, `bucket = "1 day"`, time window = last 30 days
- Only fires when the user is authenticated and a current project is set (`enabled: !!project?.id && isAuthenticated`)
- On success, persists results to a local reactive store (`usageCollection`) via `setTokenUsage`
- The `useTokenUsage` hook reads from that local store using `@tanstack/react-db` live queries
- `total_cost` is nullable end-to-end (converse-frontends#532/#533): the SDK's generated Zod schema accepts `number | null`, and consumers that need a display value (charts, the monthly consumption report) explicitly coerce `null` to `0` at the point of rendering rather than upstream — a caller needing the "unknown vs. zero" distinction must read `point.total_cost` directly instead of relying on a pre-coerced value
