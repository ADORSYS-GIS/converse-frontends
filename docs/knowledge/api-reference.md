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
| LightBridge AuthZ API | `EXPO_PUBLIC_BACKEND_URL` | RPC (`POST /rpc/{op_id}`) | `application/cbor`, always (ADR-0013 in `lightbridge-authz` / converse-frontends#256 — the earlier dev/CI-JSON, prod-CBOR split is dead: the backend deleted its JSON variant, so a JSON `Accept`/body now gets `406`/`415`) |
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
(`{ items: X[], totalCount: number | null, pageInfo: { limit: number | null, offset: number | null,
hasNextPage: boolean, hasPreviousPage: boolean } }` — this mirrors `cratestack-core::page::{Page,
PageInfo}` field-for-field, not an independently-designed client type), not a bare array — callers
must read `.items`. The generated client (`packages/authz-rpc/generated/src/client.ts`)
exposes this as a client-object API — `client.accounts`/`client.projects`/`client.apiKeys` (each
with `list`/`get`/`update`/`delete`, plus `create` only where reachable — see below) and
`client.procedures` (one method per procedure, e.g. `client.procedures.createApiKey({ args })`) —
rather than free-standing functions.

**Reachability is schema-driven, not uniform.** A model only gets a generic `create`/`update`/
`delete`/`list`/`get` op-id if the schema declares a matching `@@allow("<verb>", ...)` for it — a
missing `@@allow("create", ...)` means that verb doesn't exist at all (fail-closed by policy), and
creation goes through a dedicated procedure instead. This is why `Account` and `ApiKey` have no
generic `create`, but `Project` does.

**A schema-driven trap the generated client doesn't warn you about:** the client object also
exposes `client.projectMembers` (`list`/`get`/`update`/`delete`, mirroring `ApiKey`/`Account`/
`Project`) because `ProjectMember` is a real cratestack model in the schema. Every one of those
calls is deliberately fail-closed at the RBAC gate regardless of input, though — `ProjectMember`
exists in `authz.cstack` (lines 181-235) _only_ so `.some`/`.every`/`.none` policy predicates on
`Project`/`ApiKey` can traverse into it (its real table has a composite `(project_id, account_id)`
primary key and no `id` column at all; the model's `id` field is a synthetic workaround cratestack
requires). The actual roster read path is `procedure.listProjectRoster`, and roster mutations are
`addProjectMember`/`removeProjectMember`/`setProjectMemberRole`/`setProjectMemberQuotaTier` — none
of which are `model.ProjectMember.*`. `client.projectMembers.*` compiles and looks identical to
every other model API, but calling it always fails.

### Request envelope shapes

| Op-id shape                          | Request body                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.<X>.list`                     | `{ limit?, offset?, fields?, include?, includeFields?, sort?, where?, or?, filters?: [{ key, value }] }` — every field optional; `filters` carries equality predicates (e.g. `{ key: "accountId", value: "acc_123" }` to scope a list) |
| `model.<X>.get` / `model.<X>.delete` | `{ id }`                                                                                                                                                                                                                               |
| `model.<X>.update`                   | `{ id, patch: {...} }` — `patch` is a partial `Update<X>Input`                                                                                                                                                                         |
| `model.<X>.create`                   | the `Create<X>Input` struct directly (no wrapper)                                                                                                                                                                                      |
| `procedure.<name>`                   | `{ args: {...} }`                                                                                                                                                                                                                      |

### Accounts

| Op-id                                                  | Description                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.Account.list`                                   | List accounts the caller is a member of (list input above; no explicit account-scoping filter needed — membership already scopes the result)                                                                                                                                                                |
| `model.Account.get`                                    | Get account by ID (`{ id }`)                                                                                                                                                                                                                                                                                |
| `model.Account.update`                                 | Update account fields (`{ id, patch: UpdateAccountInput }`)                                                                                                                                                                                                                                                 |
| `model.Account.delete`                                 | Delete account                                                                                                                                                                                                                                                                                              |
| `procedure.createAccount`                              | Create an account — **the only way to create one.** Per ADR-0006, the account `id` is no longer server-generated or caller-supplied: it _is_ the caller's JWT subject (`auth().id`), read off the bearer token. A second call for the same subject is a `Conflict`, not an upsert (`authz.cstack:275-292`). |
| `procedure.disableAccount` / `procedure.enableAccount` | Suspend/restore an account (`{ args: { accountId } }`)                                                                                                                                                                                                                                                      |
| `procedure.deleteAccountPermanently`                   | Permanently delete an account, cascading to its projects/API keys/roster via `ON DELETE CASCADE` (`{ args: { accountId } }`, `authz.cstack:406-417`)                                                                                                                                                        |

#### `Account` Response Schema

`billingIdentity` is **not** a field on `Account` — a stale claim this doc previously carried.
Per ADR-0006, billing identity moved to `Project` (`billingIdentity String @unique` on the
`Project` model, `authz.cstack:87`) since one account can now have several projects billed to
different parties. `Account` itself carries only `defaultQuota` (the governance tier for usage
under the account's own default project) and `status` (`authz.cstack:44-74`):

| Field          | Type                  | Nullable | Description                                                                                                                                       |
| -------------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`              | No       | Account identifier — the caller's JWT subject, not server-generated                                                                               |
| `defaultQuota` | `string \| undefined` | **Yes**  | Governance tier for the account's own default project (validated against an operator-configured catalog at write time — config, not the database) |
| `status`       | `string`              | No       | `"active"` or `"suspended"` (`@readonly` in the schema — see the `@readonly` note under API Keys)                                                 |
| `createdAt`    | `string` (date-time)  | No       | Creation timestamp                                                                                                                                |
| `updatedAt`    | `string` (date-time)  | No       | Last update timestamp                                                                                                                             |

```json
{
  "id": "acc_abc123",
  "defaultQuota": "b-30",
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-03-01T08:30:00Z"
}
```

Note: unlike the pre-migration REST response, there is **no `owners_admins` field**. This is not a
mere API-shape change — per ADR-0006, **account-level membership was removed as a concept
entirely**: "a person's defining identity is their `accountId` — there is no account-level
membership of any kind" (`authz.cstack:11-15`). The old `AccountMembership` model and
`account_memberships` table are gone outright, not merely unlisted. Rosters exist only at the
`Project` level now (`ProjectMember`, role `lead`/`member`) — see "Project Roster" under Projects,
below. A doc or ticket that still refers to `AccountMembership` or an account-level roster is
describing a pre-ADR-0006 model.

---

### Projects

| Op-id                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model.Project.list`                                   | List projects (scope to an account via `filters: [{ key: "accountId", value }]`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `model.Project.get`                                    | Get project by ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `model.Project.create`                                 | Create a project — reachable directly (unlike Account/ApiKey). The **caller generates the id** (`cuid2`, client-side) and must supply `defaultLimits` (required, even if just `{}`). `CreateProjectInput` also requires `isDefault`/`status`/`modelPolicy` at the type level even though all three are `@readonly` and any caller-supplied value is discarded server-side — see the `@readonly` note under API Keys. `allowedModels`/`projectQuota` are ALSO present (optional) at the type level but silently discarded server-side too — see the row below |
| `model.Project.update`                                 | Update project fields. `allowedModels`, `projectQuota`, and `modelPolicy` are all present (all optional) on `UpdateProjectInput` at the type level but all three are `@readonly` server-side as of lightbridge-authz#379/#415/#418 — a caller sending any of them compiles and transmits but the server silently drops it. `setProjectAllowedModels`/`setProjectQuota` (below) are the only write paths for the first two; `modelPolicy` has no write path yet at all                                                                                        |
| `model.Project.delete`                                 | Delete project                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `procedure.disableProject` / `procedure.enableProject` | Suspend/restore a project (`{ args: { projectId } }`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `procedure.setProjectAllowedModels`                    | The only write path for `Project.allowedModels` (lightbridge-authz#415/#417, ADR-0018 Decision 5) — `{ args: { projectId, allowedModels } }`. Also the write-time validation point: rejects any entry not present in `procedure.listModelCatalog`'s operator-configured catalogue (empty/unconfigured catalogue accepts anything, unchanged behavior). Gated at `project:update`, same as `model.Project.update`                                                                                                                                             |
| `procedure.setProjectQuota`                            | The only write path for `Project.projectQuota` (lightbridge-authz#379/#397) — `{ args: { projectId, projectQuota } }`. Not yet wired to any hook/screen in this frontend as of this writing                                                                                                                                                                                                                                                                                                                                                                  |

#### `Project` Response Schema

Two fields this doc previously omitted, both real and both `@readonly`/`@unique` in the schema
(`authz.cstack:76-134`):

| Field             | Type                     | Nullable | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                 | No       | Project identifier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `accountId`       | `string`                 | No       | Parent account ID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `name`            | `string`                 | No       | Project name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `billingPlan`     | `string`                 | No       | Billing plan identifier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `billingIdentity` | `string`                 | No       | Who pays for this project. `@unique` — moved here from `Account` by ADR-0006 so one account can bill several projects to different parties                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `projectQuota`    | `string \| undefined`    | **Yes**  | Pooled usage ceiling shared by everyone on the project, drawn from the same governance-tier catalog as `Account.defaultQuota`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `isDefault`       | `boolean`                | No       | `true` only for an account's first-ever project (set by a DB trigger, `@readonly`). A default project can be suspended but never hard-deleted                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `status`          | `string`                 | No       | `"active"` or `"suspended"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `createdAt`       | `string` (date-time)     | No       | Creation timestamp                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `updatedAt`       | `string` (date-time)     | No       | Last update timestamp                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `allowedModels`   | `JsonValue \| undefined` | **Yes**  | Allowlist of model names. `@readonly` as of lightbridge-authz#415/#417 — write only via `procedure.setProjectAllowedModels`, see the op-id table above. What an empty/absent list _means_ depends on `modelPolicy` below — see that row                                                                                                                                                                                                                                                                                                                       |
| `modelPolicy`     | `string`                 | No       | ADR-0018's three-value access policy: `"allow_all"` (default — everything, `allowedModels` not consulted), `"allowlist"` (only `allowedModels` entries; empty genuinely means _nothing_, unlike the old NULL/`[]`-means-everything collapse), or `"deny_all"` (nothing, `allowedModels` ignored). `@readonly` — no write path exists yet (ADR-0018 Decision 5 deferred it until `allowedModels` got catalogue validation, lightbridge-authz#415/#417, now shipped); readable only via `model.Project.get`/`list`, introspection, and the token-exchange claim |
| `defaultLimits`   | `JsonValue`              | No       | Default rate limits for this project (opaque JSON blob, e.g. `{ requestsPerSecond, requestsPerDay, concurrentRequests }`)                                                                                                                                                                                                                                                                                                                                                                                                                                     |

`allowedModels`/`defaultLimits` are cratestack `Json` columns: on the wire (cratestack-cli
0.8.6, this repo's current pin, lockstepped with the deployed backend's `cratestack-pg` pin) they're
plain, untagged values — `{}` stays `{}`, `["x"]` stays `["x"]`. There is no client-side
tagging/untagging step; the generated client's `JsonValue` type is exactly what goes over the wire
in both directions. (Earlier revisions of this client hand-tagged these fields to match an
externally-tagged `Value` wire format from cratestack-cli 0.4.16 — removed as part of the 0.7.11+
upgrade; see lightbridge-authz#282.)

```json
{
  "id": "proj_def456",
  "accountId": "acc_abc123",
  "name": "My AI Project",
  "billingPlan": "standard",
  "billingIdentity": "billing-ref-001",
  "projectQuota": "b-100",
  "isDefault": false,
  "status": "active",
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-03-10T12:00:00Z",
  "allowedModels": ["gpt-4o", "claude-3-5-sonnet"],
  "modelPolicy": "allow_all",
  "defaultLimits": {
    "concurrentRequests": 10,
    "requestsPerDay": 1000,
    "requestsPerSecond": 5
  }
}
```

---

### Project Roster

Per ADR-0006, membership lives entirely on `Project`, not `Account` (see the Accounts section's
`owners_admins` note above). `ProjectMember` is policy-traversal-only in the schema — its generic
`model.ProjectMember.*` verbs are fail-closed (see the "schema-driven trap" note near the top of
this section) — so every roster read/write is a dedicated procedure (`authz.cstack:329-404`):

| Op-id                                 | Description                                                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `procedure.listProjectRoster`         | The roster's only read path (`{ args: { projectId } }` → `ProjectMember[]`). Wider authorization than the mutations below: any project member may read it, plus the owning account. |
| `procedure.addProjectMember`          | Add a member (`{ args: { projectId, accountId, role? } }` — `role` defaults to `"member"`)                                                                                          |
| `procedure.removeProjectMember`       | Remove a member (`{ args: { projectId, accountId } }`)                                                                                                                              |
| `procedure.setProjectMemberRole`      | Change a member's role (`{ args: { projectId, accountId, role } }` — `"lead"` or `"member"`)                                                                                        |
| `procedure.setProjectMemberQuotaTier` | Set a member's per-person usage ceiling on this project (`{ args: { projectId, accountId, quotaTier? } }`)                                                                          |

All five mutations return `Project`, not `ProjectMember` — there is no direct response for "the
roster row that was just changed"; re-fetch via `listProjectRoster` to see it. Add/remove/role/
quota-tier changes are **lead-gated**: the caller must be the project's account owner or hold a
`ProjectMember` row with `role: "lead"` on that project — enforced as hand-written SQL inside each
procedure, not a schema `@@allow` policy, because "the member row matching my subject must ALSO
have `role == "lead"`" is a compound condition on one related row that cratestack's relation-
quantifier policy language cannot express (`authz.cstack:124-133`, `:329-342`). `listProjectRoster`
itself is deliberately wider: any member may read the roster, leads are not privileged there.

---

### API Keys

| Op-id                    | Description                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.ApiKey.list`      | List API keys (scope to a project via `filters: [{ key: "projectId", value }]`)                                                                                                                                                                                                                                                        |
| `model.ApiKey.get`       | Get API key metadata by ID                                                                                                                                                                                                                                                                                                             |
| `model.ApiKey.update`    | Update `name`/`expiresAt`. Every other field is `@readonly` in the schema, but that annotation does **not** narrow the generated `UpdateApiKeyInput` TypeScript type (see note below) — the app only sends `{ name, expiresAt }` by UI convention (`api-key-settings-screen.tsx`), not because the compiler stops it from sending more |
| `model.ApiKey.delete`    | Soft-delete (sets `deletedAt`, `@@soft_delete` in the schema — every generated read excludes soft-deleted rows automatically)                                                                                                                                                                                                          |
| `procedure.createApiKey` | Create a new API key — returns the secret once. No `model.ApiKey.create`: the server must generate the id, hash the secret, and validate the billing plan, none of which a caller may supply directly                                                                                                                                  |
| `procedure.revokeApiKey` | Revoke (`{ args: { keyId } }`) — sets `status: "revoked"`                                                                                                                                                                                                                                                                              |
| `procedure.rotateApiKey` | Rotate — returns a new secret. **Capability change from the pre-migration REST API**: the old `RotateApiKey` body accepted optional `name`/`expiresAt`/`gracePeriodSeconds` overrides; the new `RotateApiKeyInput` is just `{ keyId }` — no override fields exist in the schema                                                        |

#### `procedure.createApiKey` Request (`CreateApiKeyInput`)

| Field         | Type                              | Required | Description                          |
| ------------- | --------------------------------- | -------- | ------------------------------------ |
| `projectId`   | `string`                          | **Yes**  | Project the key belongs to           |
| `name`        | `string`                          | **Yes**  | Human-readable label for the key     |
| `expiresAt`   | `string \| undefined` (date-time) | No       | Optional expiry timestamp            |
| `billingPlan` | `string`                          | **Yes**  | Billing plan to create the key under |

#### `ApiKeySecret` Response (creation and rotation only)

> **The `secret` field is returned ONCE and never again. Display it immediately to the user.**

This response is **nested**, not flat: `{ apiKey: ApiKey, secret: string, oauth2Url?: string | null }`
(`authz.cstack:266-270`, confirmed against the generated `ApiKeySecret` interface in
`packages/authz-rpc/generated/src/models.ts:292-296`). The full `ApiKey` object (see the schema
table below) sits under the `apiKey` key; `secret` and `oauth2Url` are siblings of it, not merged
into it. This flattened-vs-nested distinction has flipped at least once in this schema's own
history — see `authz.cstack:256-265`'s comment: it started nested, was flattened as a workaround
for a cratestack-pg 0.4.9-0.4.12 codegen bug (a `type` block couldn't reference a model type by
name), and was un-flattened back to nested once cratestack-pg 0.4.13 fixed that
(cratestack/cratestack#147) — so a doc or a caller written against the flattened, workaround-era
shape is now wrong.

`oauth2Url` is a real, non-dead field: `packages/hooks/src/api-keys.ts`'s `useCreateApiKey`/
`useRotateApiKey` pass the whole `ApiKeySecret` through unflattened, and `OneTimeSecretCard`
(`apps/self-service/src/components/one-time-secret-card.tsx`, wired from
`api-key-create-view.tsx`/`rotate-api-key-view.tsx`) renders it as a labeled, selectable URL when
present and well-formed, degrading silently to "not shown" otherwise.

```json
{
  "apiKey": {
    "id": "key_ghi789",
    "projectId": "proj_def456",
    "name": "My App Key",
    "keyPrefix": "lb_ghi789...",
    "status": "active",
    "billingPlan": "standard",
    "createdAt": "2025-03-30T10:00:00Z",
    "updatedAt": "2025-03-30T10:00:00Z"
  },
  "secret": "lb_ghi789fullsecretstringshownonce",
  "oauth2Url": "https://auth.example.com/oauth2/token"
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

**`@readonly` vs `@server_only`, verified against the actual generated output (not just the
schema's own comments):** `@server_only` (`keyHash`) really is dropped from the generated TS
shape entirely, on every operation. `@readonly` (`projectId`, `keyPrefix`, `status`, `lastUsedAt`,
`lastIp`, `revokedAt`, `deletedAt`, `billingPlan` on `ApiKey`; `status` on `Account`; `isDefault`/
`status`/`allowedModels`/`projectQuota`/`modelPolicy` on `Project`) behaves differently:
cratestack-cli's TypeScript generator still emits every `@readonly` field on `Update<X>Input`, and
on `CreateProjectInput` (the one model with a generic `create`) too — in both cases, the field is
never actually _dropped_. **Correction to an earlier revision of this doc:** that revision claimed
these fields are "always optional" on `CreateProjectInput` — checked directly against
`packages/authz-rpc/generated/src/models.ts` (regenerated against cratestack-cli **0.8.6**, this
repo's current pin, lockstepped with `lightbridge-authz`'s own `cratestack-pg` pin — see
`rpc-and-codegen.md`'s "version pin is a lockstep contract" section) and that is not what
determines it. What actually determines optionality is the field's own **schema-level
nullability**, unrelated to `@readonly`: `allowedModels` (`Json?`) and `projectQuota` (`String?`)
generate as optional (`field?: T | null`); `isDefault` (`Boolean`), `status` (`String`), and
`modelPolicy` (`String`, ADR-0018) generate as **required** (`field: T`), `@readonly`
notwithstanding. Either way — required or optional — the field is never actually dropped from
either generated input type on any cratestack-cli version this repo has used. This contradicts the
schema's own comment on `ApiKey` ("`@readonly` drops a field from BOTH the generated
`CreateApiKeyInput` and `UpdateApiKeyInput`") — the schema comment describes cratestack's
_Rust_-side codegen behavior accurately but not its TypeScript output. The enforcement that
actually exists is server-side and silent, not a TypeScript compile error:
`packages/hooks/src/projects.ts`'s `buildCreateProjectInput` documents this directly —
`isDefault: false`/`status: 'active'`/`modelPolicy: 'allow_all'` must still be supplied to satisfy
`CreateProjectInput`'s required fields, with the comment "Any caller-supplied value is ignored
server-side, same as `status` above." Treat every `@readonly` field the same way for UI purposes:
**never surface it as an editable control**, even though nothing in the generated types would stop
you from wiring one up — the value would compile, transmit, and then be silently discarded
server-side, not rejected. `procedure.setProjectAllowedModels`/`procedure.setProjectQuota` are
exactly this pattern's answer for two of the `Project` fields that need to stay editable
post-creation — a dedicated procedure, not the generic verb, see the Project op-id table above.
`modelPolicy` has no such procedure yet — ADR-0018 Decision 5 deliberately deferred a
`setProjectModelPolicy`-style write path until `allowedModels` got catalogue validation
(lightbridge-authz#415/#417, now shipped); until it lands, `modelPolicy` is readable only. See
`rpc-and-codegen.md` for the full
convention writeup.

---

### Budget

Budget policy/refill (ADR-0007; `packages/authz-rpc/schema/authz.cstack:465-683`). Every op-id here
is a `procedure.*` — there is no `model.Budget*` or `model.AugmentationRequest*` generic CRUD
surface; policy state is served from an in-memory engine (`PolicyStore`) and the augmentation
ledger is a request/decision log, neither modeled as a cratestack-managed table in this schema.

| Op-id                                       | Description                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `procedure.activateBudgetPolicy`            | Activate a policy: either brand-new rule data (`ruleDataJson`) or a rollback to an existing revision (`revisionId`) — exactly one of the two, validated by the procedure, not the schema (schema:474-490) |
| `procedure.getBudgetPolicyStatus`           | Read the revision genuinely serving `evaluate()` right now — may differ from the most recently _attempted_ activation if that attempt was rejected (schema:492-503)                                       |
| `procedure.simulateBudgetPolicy`            | Dry-run a proposed policy against a caller-supplied scenario — no DB read/write, nothing persisted (schema:531-562)                                                                                       |
| `procedure.requestBudgetRefill`             | Self-service budget refill: auto-granted or queued for review (schema:615-643)                                                                                                                            |
| `procedure.listPendingAugmentationRequests` | Admin review queue read path. Omitting `budgetAccountId` lists the whole cross-account queue (schema:645-657)                                                                                             |
| `procedure.approveAugmentationRequest`      | Approve a `pending_review` request, granting the requested amount (schema:659-668)                                                                                                                        |
| `procedure.rejectAugmentationRequest`       | Reject a `pending_review` request. `reason` is a required (non-optional) schema field (schema:670-683)                                                                                                    |

**`requestedAmountMicros`/`approvedAmountMicros`/`maximumAmountMicros` are decimal strings, not
`Int`** — same rationale as everywhere else large money amounts appear in this schema: cratestack's
TypeScript codegen maps `Int` to a bare JS `number`, lossy above 2^53, so these fields stay `String`
end-to-end (schema comment at `authz.cstack:538-547`). `packages/hooks/src/budget-tiers.ts`'s
`formatMicroUsd` is the reference implementation for consuming one of these safely — BigInt
arithmetic only, `Number()` never enters the picture. See `rpc-and-codegen.md` for the full
convention and why `decimal.js` in `packages/authz-rpc/package.json` is unrelated to this (it backs
cratestack's separate `Decimal` scalar type, which this schema does not use anywhere).

#### `BudgetPolicyStatus` (`activateBudgetPolicy`, `getBudgetPolicyStatus`)

| Field                  | Type     | Description                                          |
| ---------------------- | -------- | ---------------------------------------------------- |
| `policySetId`          | `string` | The policy set this status is for                    |
| `activePolicyRevision` | `string` | The revision ID currently serving `evaluate()` calls |

#### `Decision` (`simulateBudgetPolicy`)

| Field                  | Type          | Description                                                                                                                                                                                              |
| ---------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effect`               | `string`      | `"auto_approve" \| "manual_review" \| "deny"` — the raw snake_case wire value of the backend's `Effect` enum, carried as a plain string (no schema-level enum exists for it; see `authz.cstack:512-520`) |
| `approvedAmountMicros` | `string`      | Decimal-string micro-USD                                                                                                                                                                                 |
| `maximumAmountMicros`  | `string`      | Decimal-string micro-USD                                                                                                                                                                                 |
| `reasonCodes`          | `string[]`    | Why the engine reached this decision                                                                                                                                                                     |
| `matchedRuleIds`       | `string[]`    | Which policy rules matched                                                                                                                                                                               |
| `policyRevision`       | `string`      | The revision that produced this decision                                                                                                                                                                 |
| `obligations`          | `Obligations` | `{ requiredApproverRole?: string }` — currently the only obligation kind the policy engine attaches                                                                                                      |

#### `AugmentationRequest` (`requestBudgetRefill`, the review-queue procedures)

| Field                   | Type                  | Nullable | Description                                                                    |
| ----------------------- | --------------------- | -------- | ------------------------------------------------------------------------------ |
| `id`                    | `string`              | No       | Request identifier                                                             |
| `budgetAccountId`       | `string`              | No       | Budget account this request is against                                         |
| `accountId`             | `string`              | No       | Requesting account                                                             |
| `projectId`             | `string \| undefined` | **Yes**  | Optional project scoping — budget itself is account-scoped, not project-scoped |
| `period`                | `string`              | No       | `'YYYY-MM'` calendar month                                                     |
| `requestedTier`         | `string`              | No       | See note below — no input field sets this directly                             |
| `requestedAmountMicros` | `string`              | No       | Decimal-string micro-USD                                                       |
| `status`                | `string`              | No       | e.g. `"pending_review"`, wire value of the backend's `AugmentationStatus`      |
| `policyEffect`          | `string \| undefined` | **Yes**  | Set once a decision has run                                                    |
| `policyReasonCodes`     | `string[]`            | No       | Always present (possibly empty) by the time a caller can observe the row       |
| `matchedRuleIds`        | `string[]`            | No       | Same as above                                                                  |
| `policyRevision`        | `string \| undefined` | **Yes**  |                                                                                |
| `approvedAmountMicros`  | `string \| undefined` | **Yes**  | Decimal-string micro-USD, set on grant                                         |
| `grantId`               | `string \| undefined` | **Yes**  |                                                                                |
| `idempotencyKey`        | `string \| undefined` | **Yes**  |                                                                                |
| `reviewedBy`            | `string \| undefined` | **Yes**  |                                                                                |
| `rejectionReason`       | `string \| undefined` | **Yes**  |                                                                                |
| `createdAt`             | `string` (date-time)  | No       |                                                                                |
| `reviewedAt`            | `string \| undefined` | **Yes**  |                                                                                |

**Worked example of verifying against the schema instead of assuming a shape:** `RequestBudgetRefillInput`
(`authz.cstack:634-640`) is `{ budgetAccountId, accountId, projectId?, period, idempotencyKey? }` —
no `tier` field of any kind, even though `AugmentationRequest.requestedTier` exists on the _return_
type. A caller cannot select a tier when requesting a refill; the server derives it.
`packages/hooks/src/budget.ts` (lines 26-35) documents having checked this directly against the schema before
implementing `useRequestBudgetRefill`, and deliberately does not accept a `tier` argument as a
result — a design doc or ticket describing a tier-picker control on this specific screen would be
describing something the input type cannot carry.

**Known gap, stated in the schema itself (`authz.cstack:628-633`):** `requestBudgetRefill` is
supposed to be OIDC-human-only per its originating ticket's acceptance criteria, but nothing on
this RPC surface today distinguishes an OIDC-human caller from an API-key-derived one, so that
restriction is not enforced anywhere in this stack yet.

---

## LightBridge Usage API Endpoints

| Method | Path                    | Operation ID  | Description                  |
| ------ | ----------------------- | ------------- | ---------------------------- |
| `POST` | `/usage/v1/usage/query` | `query_usage` | Query time-series usage data |

For the full request/response schema, worked examples, and enum definitions, see **`api-usage-backend.md`**.

---

## Error Codes

### AuthZ API

Two distinct error body shapes exist, depending on which layer rejects the request. There is no
`packages/authz-rpc/src/transport.ts` (an earlier revision of this doc cited one for this section;
the package has no file by that name today — see `rpc-and-codegen.md` for the real file layout). A
hand-written `transport.ts` genuinely existed before commit `9138138` ("switch to official
cratestack generate-typescript codegen"); its `RpcError`/`extractErrorMessage` handled both shapes
symmetrically (checked `body.message`, then fell back to `body.error`) before it was deleted in
that refactor in favor of the official generated client. Decoding today happens in the _generated_
runtime's `readErrorBody` (`packages/authz-rpc/generated/src/runtime.ts`), not in any hand-written
transport code, and — as detailed below — it is a regression relative to the old hand-written
version, not just a relocation:

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

These two shapes are **not handled symmetrically on the client, and this is a regression from the
pre-codegen-switch behavior.** `readErrorBody` only recognizes shape 2 — it checks for a string
`code` field and falls back to a generic `{ code: "internal", message: "...with an unrecognized
error body" }` otherwise (`generated/src/runtime.ts`'s `readErrorBody`). Shape 1's `error` string
has no `code` field, so it hits that fallback and the RBAC gate's actual denial reason is
**discarded** before it reaches `CratestackRpcError.message` — a caller only ever sees the generic
wrapper text for an RBAC-gate denial, never the original `"string describing why the call was
denied"`. The deleted hand-written `transport.ts` did not have this gap (see above — it checked
`message` then fell back to `error`), so this is something the official-codegen migration silently
lost, not a limitation that was always there. Not verified against a live 403 response (no backend
access from this repo); read directly from the decode logic on both sides of the migration.

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
