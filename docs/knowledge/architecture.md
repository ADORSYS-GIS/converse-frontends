# Architecture Overview — Converse-frontends

> Sources: `AGENTS.md`, `apps/self-service/src/`, `packages/`, `openapi/`

---

## System Overview

This repository is a **pnpm monorepo** containing the LightBridge self-service frontend — a React / React Native (Expo) application that serves as the self-service portal for Converse, an AI gateway platform.

The system is a **static frontend** (no server-side rendering, no backend logic):
- Compiled to a static web bundle via `expo export --platform web`
- Served by nginx as a static site
- All business logic lives in the browser; the backend is LightBridge (external Rust service)

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    self-service (Expo App)                       │
│                                                                  │
│  app/ (routes)                                                   │
│    └─ screens/                                                   │
│         └─ views/  ──── @lightbridge/ui (design system)         │
│              └─ @lightbridge/hooks ──── @lightbridge/api-rest    │
│                   └─ @lightbridge/i18n  └─ (generated from       │
│                                             openapi/*.yaml)      │
└─────────────────────────────────────────────────────────────────┘
           │                                │
           │ Bearer JWT                     │ Bearer JWT
           ▼                                ▼
  LightBridge AuthZ API          LightBridge Usage API
  (api-key.backend.yaml)         (usage.backend.yaml)
           │
           │ API Key issued to external clients
           ▼
  Converse AI Gateway  (api.ai.camer.digital/v1)
```

---

## Key Components

| Component | Package | Responsibility | Tech Stack |
|-----------|---------|----------------|------------|
| Self-service app | `apps/self-service` | Entry point, routing, screen assembly | Expo 54, React 19, Expo Router |
| REST API client | `packages/api-rest` | Auto-generated HTTP client from OpenAPI | `@hey-api/openapi-ts` |
| Shared hooks | `packages/hooks` | Data fetching, auth, business logic | TanStack Query, Zustand/TanStack DB |
| Design system | `packages/ui` | Shared UI primitives, theming | React Native, `cva`, `cn` |
| i18n | `packages/i18n` | Translation files and config | `react-i18next` |
| Native API utils | `packages/api-native` | Mobile-specific API helpers | React Native |

---

## Layering (Strict Dependency Direction)

```
Routes (app/)
  ↓ renders
Screens (screens/)
  ↓ assembles
Views (views/)
  ↓ calls
Hooks (packages/hooks/)
  ↓ calls
API Client (packages/api-rest/)
  ↓ HTTP
LightBridge Backend
```

**Rules:**
- Routes render exactly one Screen. No logic, no hooks.
- Screens assemble one or more Views. No direct API calls.
- Views call hooks for data. No `fetch()` calls directly.
- Hooks use `@tanstack/react-query` for all server state. No API calls in `useEffect`.
- The API client is **always** auto-generated. Never hand-edit `packages/api-rest/src/`.

---

## Data Flow

### Authentication flow
1. App loads → reads `AuthSession` from storage (`loadStoredSession`)
2. If no session → show Login screen → trigger Keycloak OAuth2/PKCE redirect
3. Keycloak redirects back with auth code → frontend exchanges code for tokens
4. Tokens stored in platform storage (IndexedDB on web, SecureStore on native)
5. All subsequent API calls include `Authorization: Bearer <accessToken>`

### API key management flow
1. Authenticated user navigates to API Keys tab
2. `useQuery` hook fetches from `GET /api/v1/projects/{project_id}/api-keys`
3. User creates key → `POST /api/v1/projects/{project_id}/api-keys`
4. Response includes one-time `ApiKeySecret.secret` — shown to user immediately
5. User copies secret for use in their external AI client

### Usage data flow
1. User navigates to Usage tab (currently renders "coming soon" placeholder)
2. `useQueryUsage` hook queries `POST /usage/v1/usage/query`
3. Response `UsageSeriesPoint[]` stored in local reactive store (`usageCollection`)
4. `useTokenUsage` hook provides live-queried data to the view via `@tanstack/react-db`

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Expo Router (file-based routing) | Enables web + native from single codebase; routes map directly to file paths |
| Auto-generated API client | OpenAPI spec is the single source of truth; codegen eliminates drift between frontend types and backend contracts |
| TanStack Query for server state | Declarative, caching-aware, no global store pollution |
| Platform-specific token storage | `expo-secure-store` on native (hardware-backed), IndexedDB on web — appropriate security per platform |
| Static export + nginx | Simple, LTS-stable serving; no Node.js runtime required in production |
| WireMock for local dev | Allows frontend development without running the real Rust/Postgres backend |

---

## External Dependencies

| Service | Purpose | URL (prod) |
|---------|---------|------------|
| Keycloak | OAuth2/OIDC provider — issues Bearer tokens | Configured via `EXPO_PUBLIC_KEYCLOAK_ISSUER` |
| LightBridge AuthZ API | Account, project, API key management | Configured via `EXPO_PUBLIC_BACKEND_URL` |
| LightBridge Usage API | Time-series usage query | Configured via `EXPO_PUBLIC_USAGE_URL` |
| Converse AI Gateway | LLM proxy (external clients only, not this frontend) | Configured via `EXPO_PUBLIC_GATEWAY_URL` |

---

## Security Architecture

- **Authentication:** OAuth2 Authorization Code + PKCE (S256). No implicit flow. No client secrets stored.
- **Token storage:** Platform-appropriate secure storage (see `auth-and-identity.md`)
- **Secrets:** No secrets baked into the container image. All config injected at runtime via environment variables.
- **TLS:** Not terminated by the app or nginx — expected at ingress/load-balancer level.
- **CORS:** Handled by the LightBridge backend; the frontend never bypasses CORS.
- **Input validation:** All API shapes are typed and validated via generated TypeScript types from OpenAPI.
