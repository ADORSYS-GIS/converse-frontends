# API: LightBridge Usage Backend

> Source of truth: `openapi/usage.backend.yaml` (version `0.6.6`)
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

Queries time-series usage data for a given scope (user, project, or account) over a specified time window.

### Request Body: `UsageQueryRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | `UsageScope` (enum) | **Yes** | The scope to query: `"user"`, `"project"`, or `"account"` |
| `scope_id` | `string` | **Yes** | The ID of the entity matching the scope (e.g. project ID, user ID, account ID) |
| `start_time` | `string` (date-time) | **Yes** | Start of the time window (ISO 8601 UTC, e.g. `"2025-03-01T00:00:00Z"`) |
| `end_time` | `string` (date-time) | **Yes** | End of the time window (ISO 8601 UTC) |
| `bucket` | `string` | No | Time bucket size for aggregation (e.g. `"1 day"`, `"1 hour"`). The frontend defaults to `"1 day"` |
| `filters` | `UsageQueryFilters` (object) | No | Narrow results by specific dimensions. All fields nullable/optional |
| `group_by` | `UsageGroupBy[]` (array of enum) | No | Group results by one or more dimensions |
| `limit` | `integer` (int32, ≥ 0) | No | Maximum number of data points to return |

### `UsageQueryFilters` Object

All fields in this object are **optional** and **nullable**:

| Field | Type | Description |
|-------|------|-------------|
| `account_id` | `string \| null` | Filter to a specific account |
| `project_id` | `string \| null` | Filter to a specific project |
| `user_id` | `string \| null` | Filter to a specific user |
| `model` | `string \| null` | Filter to a specific model name |
| `metric_name` | `string \| null` | Filter to a specific metric |
| `signal_type` | `string \| null` | Filter to a specific signal type |

---

### Response: `UsageQueryResponse`

```json
{
  "points": [ /* UsageSeriesPoint[] */ ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `points` | `UsageSeriesPoint[]` | **Yes** | Array of time-series data points. May be empty if no data exists for the window |

---

### Response Item: `UsageSeriesPoint`

Each element in the `points` array has the following shape:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `bucket_start` | `string` (date-time) | No | Start timestamp of this time bucket (ISO 8601 UTC) |
| `requests` | `integer` (int64) | No | Number of API requests in this bucket |
| `usage_value` | `number` (double) | No | Cost/usage value for this bucket (unit defined by metric; typically USD cost) |
| `prompt_tokens` | `integer` (int64) | No | Total prompt tokens consumed in this bucket |
| `completion_tokens` | `integer` (int64) | No | Total completion tokens generated in this bucket |
| `total_tokens` | `integer` (int64) | No | Sum of `prompt_tokens` + `completion_tokens` |
| `account_id` | `string \| null` | **Yes** | Account ID (populated when `group_by` includes `account_id`) |
| `project_id` | `string \| null` | **Yes** | Project ID (populated when `group_by` includes `project_id`) |
| `user_id` | `string \| null` | **Yes** | User ID (populated when `group_by` includes `user_id`) |
| `model` | `string \| null` | **Yes** | Model name (populated when `group_by` includes `model`) |
| `metric_name` | `string \| null` | **Yes** | Metric name (populated when `group_by` includes `metric_name`) |
| `signal_type` | `string \| null` | **Yes** | Signal type (populated when `group_by` includes `signal_type`) |

---

### Error Response: `UsageErrorResponse`

HTTP `400`:

```json
{
  "error": "string describing the validation failure"
}
```

| Field | Type | Required |
|-------|------|----------|
| `error` | `string` | **Yes** |

---

## Enums

### `UsageScope`

Controls what entity the `scope_id` refers to:

| Value | Meaning |
|-------|---------|
| `"user"` | Query usage for a single user identified by `scope_id` |
| `"project"` | Query usage for an entire project identified by `scope_id` |
| `"account"` | Query usage for an entire account (all projects within it) identified by `scope_id` |

### `UsageGroupBy`

Dimensions by which response points can be broken down. Pass as an array in `group_by`:

| Value | Practical meaning |
|-------|------------------|
| `"account_id"` | Break results down per account. Useful for account-level queries with multiple sub-accounts |
| `"project_id"` | Break results down per project. Useful for understanding which project drives the most usage |
| `"user_id"` | Break results down per user. Useful for identifying heavy consumers within a project |
| `"model"` | Break results down per LLM model name. Useful for understanding cost by model |
| `"metric_name"` | Break results down per metric type |
| `"signal_type"` | Break results down per signal type (e.g. distinguishing traces from metrics) |

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
      "prompt_tokens": 18500,
      "completion_tokens": 4200,
      "total_tokens": 22700,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null
    },
    {
      "bucket_start": "2025-03-01T00:00:00Z",
      "requests": 209,
      "usage_value": 0.41,
      "prompt_tokens": 27300,
      "completion_tokens": 6100,
      "total_tokens": 33400,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null
    }
  ]
}
```

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
      "usage_value": 0.20,
      "prompt_tokens": 12000,
      "completion_tokens": 3000,
      "total_tokens": 15000,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "model": "gpt-4o",
      "metric_name": null,
      "signal_type": null
    },
    {
      "bucket_start": "2025-03-01T00:00:00Z",
      "requests": 109,
      "usage_value": 0.21,
      "prompt_tokens": 15300,
      "completion_tokens": 3100,
      "total_tokens": 18400,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "model": "claude-3-5-sonnet",
      "metric_name": null,
      "signal_type": null
    }
  ]
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
      "prompt_tokens": 5800,
      "completion_tokens": 1400,
      "total_tokens": 7200,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null
    },
    {
      "bucket_start": "2025-03-02T00:00:00Z",
      "requests": 62,
      "usage_value": 0.12,
      "prompt_tokens": 7900,
      "completion_tokens": 1900,
      "total_tokens": 9800,
      "account_id": null,
      "project_id": null,
      "user_id": null,
      "model": null,
      "metric_name": null,
      "signal_type": null
    }
  ]
}
```

---

## Frontend Integration

The hook `useQueryUsage` in `packages/hooks/src/usage.ts` wraps this endpoint:

- Defaults: `scope = "project"`, `scope_id` = current project ID, `bucket = "1 day"`, time window = last 30 days
- Only fires when the user is authenticated and a current project is set (`enabled: !!project?.id && isAuthenticated`)
- On success, persists results to a local reactive store (`usageCollection`) via `setTokenUsage`
- The `useTokenUsage` hook reads from that local store using `@tanstack/react-db` live queries
