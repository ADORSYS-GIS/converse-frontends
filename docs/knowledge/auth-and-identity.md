# Authentication and Identity

> Sources:
> - `packages/hooks/src/auth/auth-storage.ts`
> - `packages/hooks/src/auth/auth-types.ts`
> - `packages/hooks/src/auth/use-keycloak-login.ts`
> - `packages/hooks/src/auth/use-auth-session.ts`
> - `openapi/api-key.backend.yaml` (security scheme)

---

## Critical Distinction: Bearer Token vs. API Key

These are two completely separate credential types with different purposes and lifetimes:

| Credential | Type | Issued By | Used By | Purpose |
|------------|------|-----------|---------|---------|
| **Bearer Token** | Short-lived JWT | Keycloak | This frontend | Authenticate the logged-in user with LightBridge backend |
| **API Key** | Long-lived secret string | LightBridge backend | External AI clients | Authenticate with the Converse AI gateway |

> The frontend **never** uses API keys to make requests. API keys are managed *through* the frontend but consumed *outside* it.
> The Converse AI gateway is **never** called by this frontend. External AI clients call it directly using their API key.

---

## User Authentication: Keycloak OAuth2 / PKCE

### Flow

Authentication uses the **Authorization Code Flow with PKCE** (Proof Key for Code Exchange), implemented via `expo-auth-session`.

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
- Discovery is performed via `AuthSession.useAutoDiscovery(config.issuer)` — all Keycloak endpoint URLs are resolved from the OIDC discovery document, not hardcoded.
- The `useKeycloakLogin` hook exposes `promptAsync()` to trigger the login redirect and `isLoading` to track exchange state.

### Token Refresh

`refreshAccessToken()` in `use-keycloak-login.ts`:
- Posts `grant_type=refresh_token` to the Keycloak token endpoint.
- Re-fetches user info if the new access token is valid.
- Persists the refreshed session to storage.
- Returns `null` on any failure (caller is responsible for handling expired sessions).

---

## Token Types: `AuthTokens`

Defined in `packages/hooks/src/auth/auth-types.ts`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accessToken` | `string` | **Yes** | Bearer token sent in `Authorization` header to LightBridge |
| `refreshToken` | `string` | No | Used to obtain new access tokens without re-login |
| `idToken` | `string` | No | OIDC identity token (Keycloak-issued, contains user claims) |
| `expiresAt` | `number` | No | Epoch milliseconds at which `accessToken` expires |
| `tokenType` | `string` | No | Typically `"Bearer"` |
| `scope` | `string` | No | Space-separated OAuth2 scopes granted |

---

## User Object: `AuthUser`

Populated from Keycloak's `/userinfo` endpoint:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | **Yes** | Keycloak subject (`sub` claim) |
| `name` | `string` | No | Display name (`name` or `preferred_username` from userinfo) |
| `email` | `string` | No | Email address |

---

## Session Object: `AuthSession`

The full session stored in persistent storage:

```typescript
type AuthSession = {
  id: 'current';         // always the literal string 'current'
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
- On first load, a **one-time migration** attempts to read from the legacy default store and copies the session to the app-specific store, then deletes the legacy entry.
- `del()` is called best-effort on web; errors (e.g. private browsing) are silently ignored.

### Native (iOS / Android)

- **Storage:** `expo-secure-store` (`SecureStore.getItemAsync` / `setItemAsync` / `deleteItemAsync`)
- Session is JSON-serialized before storage and parsed on retrieval.

### Storage API

| Function | Platform | Effect |
|----------|----------|--------|
| `loadStoredSession()` | Both | Returns `AuthSession \| null` |
| `saveStoredSession(session)` | Both | Persists the session |
| `clearStoredSession()` | Both | Deletes the persisted session |

---

## Request Flow: Calling LightBridge with a Bearer Token

Once authenticated, all frontend requests to the LightBridge AuthZ and Usage APIs include:

```
Authorization: Bearer <accessToken>
```

The `api-key.backend.yaml` security scheme confirms this:
```yaml
securitySchemes:
  bearer_auth:
    type: http
    scheme: bearer
    bearerFormat: JWT
security:
  - bearer_auth: []
```

---

## API Keys (Managed, Not Used, by This Frontend)

API keys are issued by the LightBridge backend and are separate from authentication tokens.

From `openapi/api-key.backend.yaml`:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | Unique key identifier |
| `project_id` | `string` | No | Project the key belongs to |
| `name` | `string` | No | Human-readable label |
| `key_prefix` | `string` | No | Visible prefix of the secret (e.g. `"lb_abc123..."`) |
| `status` | `ApiKeyStatus` | No | `"active"` or `"revoked"` |
| `created_at` | `string` (date-time) | No | Creation timestamp |
| `expires_at` | `string` (date-time) \| `null` | **Yes** | Optional expiry |
| `last_used_at` | `string` (date-time) \| `null` | **Yes** | Last usage timestamp |
| `last_ip` | `string \| null` | **Yes** | IP of last caller |
| `revoked_at` | `string` (date-time) \| `null` | **Yes** | Revocation timestamp |

The secret is only returned **once**, at creation or rotation, in an `ApiKeySecret` object:

```json
{
  "api_key": { /* ApiKey object */ },
  "secret": "lb_full_secret_string_shown_once"
}
```

The frontend displays this secret to the user at that moment; it is not stored by the frontend.
