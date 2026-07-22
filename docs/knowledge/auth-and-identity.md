# Authentication and Identity

> Sources:
>
> - `packages/hooks/src/auth/auth-storage.ts`
> - `packages/hooks/src/auth/auth-types.ts`
> - `packages/hooks/src/auth/use-keycloak-login.ts`
> - `packages/hooks/src/auth/use-auth-session.ts`
> - `packages/authz-rpc/src/transport.ts` (bearer header + refresh wiring)
> - `packages/authz-rpc/schema/authz.cstack` (API-key schema)

---

## Critical Distinction: Bearer Token vs. API Key

These are two completely separate credential types with different purposes and lifetimes:

| Credential       | Type                     | Issued By           | Used By             | Purpose                                                  |
| ---------------- | ------------------------ | ------------------- | ------------------- | -------------------------------------------------------- |
| **Bearer Token** | Short-lived JWT          | Keycloak            | This frontend       | Authenticate the logged-in user with LightBridge backend |
| **API Key**      | Long-lived secret string | LightBridge backend | External AI clients | Authenticate with the Converse AI gateway                |

> The frontend **never** uses API keys to make requests. API keys are managed _through_ the frontend but consumed
> _outside_ it.
> The Converse AI gateway is **never** called by this frontend. External AI clients call it directly using their API
> key.

---

## User Authentication: Keycloak OAuth2 / PKCE

### Flow

Authentication uses the **Authorization Code Flow with PKCE** (Proof Key for Code Exchange), implemented via
`expo-auth-session`.

```
User clicks Login
       │
       ▼
Frontend generates code_verifier + code_challenge (S256)
       │
       ▼
Redirect to Keycloak /authorize?response_type=code&code_challenge=...
       │  (user authenticates with Keycloak)
       ▼
Keycloak redirects back with authorization code
       │
       ▼
Frontend exchanges code → tokens at Keycloak /token endpoint
       │  (POST with code_verifier for PKCE validation)
       ▼
Frontend fetches user info from Keycloak /userinfo endpoint
       │
       ▼
AuthSession stored (see Token Storage below)
```

### Key implementation details (from `use-keycloak-login.ts`)

- **PKCE method:** `CodeChallengeMethod.S256`
- **Response type:** `ResponseType.Code`
- **Default scopes:** `['openid', 'profile', 'email']`
- Discovery is performed via `AuthSession.useAutoDiscovery(config.issuer)` — all Keycloak endpoint URLs are resolved
  from the OIDC discovery document, not hardcoded.
- The `useKeycloakLogin` hook exposes `promptAsync()` to trigger the login redirect and `isLoading` to track exchange
  state.

### Token Refresh

`refreshAccessToken()` in `use-keycloak-login.ts`:

- Posts `grant_type=refresh_token` to the Keycloak token endpoint.
- Re-fetches user info if the new access token is valid.
- Persists the refreshed session to storage.
- Returns `null` on any failure (caller is responsible for handling expired sessions).

---

## Token Types: `AuthTokens`

Defined in `packages/hooks/src/auth/auth-types.ts`:

| Field          | Type     | Required | Description                                                 |
| -------------- | -------- | -------- | ----------------------------------------------------------- |
| `accessToken`  | `string` | **Yes**  | Bearer token sent in `Authorization` header to LightBridge  |
| `refreshToken` | `string` | No       | Used to obtain new access tokens without re-login           |
| `idToken`      | `string` | No       | OIDC identity token (Keycloak-issued, contains user claims) |
| `expiresAt`    | `number` | No       | Epoch milliseconds at which `accessToken` expires           |
| `tokenType`    | `string` | No       | Typically `"Bearer"`                                        |
| `scope`        | `string` | No       | Space-separated OAuth2 scopes granted                       |

---

## User Object: `AuthUser`

Populated from Keycloak's `/userinfo` endpoint:

| Field   | Type     | Required | Description                                                 |
| ------- | -------- | -------- | ----------------------------------------------------------- |
| `id`    | `string` | **Yes**  | Keycloak subject (`sub` claim)                              |
| `name`  | `string` | No       | Display name (`name` or `preferred_username` from userinfo) |
| `email` | `string` | No       | Email address                                               |

---

## Session Object: `AuthSession`

The full session stored in persistent storage:

```typescript
type AuthSession = {
  id: 'current'; // always the literal string 'current'
  user: AuthUser | null; // null if userinfo fetch failed
  tokens: AuthTokens | null;
};
```

Storage key: `"lightbridge.auth.session"`

---

## Token Storage

Platform-specific storage is implemented in `packages/hooks/src/auth/auth-storage.ts`:

### Web (browser)

- **Storage:** IndexedDB via `idb-keyval`
- **Database name:** `lightbridge-web-storage`
- **Store name:** `auth`
- An app-specific DB/store is used to avoid collisions with the `idb-keyval` defaults (`keyval-store` / `keyval`).
- On first load, a **one-time migration** attempts to read from the legacy default store and copies the session to the
  app-specific store, then deletes the legacy entry.
- `del()` is called best-effort on web; errors (e.g. private browsing) are silently ignored.

### Native (iOS / Android)

- **Storage:** `expo-secure-store` (`SecureStore.getItemAsync` / `setItemAsync` / `deleteItemAsync`)
- Session is JSON-serialized before storage and parsed on retrieval.

### Storage API

| Function                     | Platform | Effect                        |
| ---------------------------- | -------- | ----------------------------- |
| `loadStoredSession()`        | Both     | Returns `AuthSession \| null` |
| `saveStoredSession(session)` | Both     | Persists the session          |
| `clearStoredSession()`       | Both     | Deletes the persisted session |

---

## Request Flow: Calling LightBridge with a Bearer Token

Once authenticated, all frontend requests to the LightBridge AuthZ and Usage APIs include:

```
Authorization: Bearer <accessToken>
```

The AuthZ API's `cratestack::AuthProvider` implementation (`CratestackAuthProvider`, backend-side)
extracts and validates this same bearer/JWKS token exactly as before the RPC migration — it just
sits in front of the RPC dispatcher instead of REST handlers now. On the frontend, the header is
attached by `packages/authz-rpc/src/transport.ts`'s `rpcCall()`, which mirrors the previous REST
client's proactive-refresh / 401-retry-once behavior:

```typescript
// packages/authz-rpc/src/transport.ts (abridged)
headers.authorization = `Bearer ${token}`;
```

The Usage API is unaffected — it still authenticates the same way over plain REST, via
`@lightbridge/api-rest`'s generated OpenAPI security scheme.

---

## API Keys (Managed, Not Used, by This Frontend)

API keys are issued by the LightBridge backend and are separate from authentication tokens.

From `packages/authz-rpc/schema/authz.cstack` (model `ApiKey`, generated type in
`packages/authz-rpc/generated/models.ts`) — note these are the wire field names as of the
cratestack RPC migration, **camelCase**, not the pre-migration REST API's snake_case:

| Field         | Type                  | Nullable | Description                                           |
| ------------- | --------------------- | -------- | ----------------------------------------------------- |
| `id`          | `string`              | No       | Unique key identifier                                 |
| `projectId`   | `string`              | No       | Project the key belongs to                            |
| `name`        | `string`              | No       | Human-readable label                                  |
| `keyPrefix`   | `string`              | No       | Visible prefix of the secret (e.g. `"lb_abc123..."`)  |
| `status`      | `string`              | No       | `"active"` or `"revoked"`                             |
| `billingPlan` | `string`              | No       | Billing plan the key was created under                |
| `createdAt`   | `string` (date-time)  | No       | Creation timestamp                                    |
| `updatedAt`   | `string` (date-time)  | No       | Last update timestamp                                 |
| `expiresAt`   | `string \| undefined` | **Yes**  | Optional expiry                                       |
| `lastUsedAt`  | `string \| undefined` | **Yes**  | Last usage timestamp                                  |
| `lastIp`      | `string \| undefined` | **Yes**  | IP of last caller                                     |
| `revokedAt`   | `string \| undefined` | **Yes**  | Revocation timestamp                                  |
| `deletedAt`   | `string \| undefined` | **Yes**  | Soft-delete timestamp (`@@soft_delete` in the schema) |

Note: the schema also declares a `keyHash` column, but it's marked `@server_only` — it's never
emitted on the wire and does not appear in the generated `ApiKey` TypeScript type at all.

The secret is only returned **once**, at creation (`procedure.createApiKey`) or rotation
(`procedure.rotateApiKey`), as an `ApiKeySecret` object. Unlike the pre-migration REST response,
this is **flat** — the `ApiKey` fields and `secret` sit side by side, not nested under an `api_key`
key (the schema's own comment explains why: `cratestack-pg` 0.4.9 can't reference a model type by
name inside a `type` block, so `ApiKeySecret` inlines every `ApiKey` field as a scalar instead of
nesting the model):

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

The frontend displays this secret to the user at that moment; it is not stored by the frontend.
