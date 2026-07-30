# Architecture Conventions

> Source of truth: `AGENTS.md`
> Supplemented by: codebase structure inspection

This document is a condensed set of **strict rules** for agents working on this repository. Deviations from these rules should be treated as bugs.

---

## Monorepo Structure

The repository is a **pnpm monorepo** with two top-level source directories:

```
converse-frontends/
├── apps/             # Deployable applications
│   └── self-service/ # The LightBridge self-service web/mobile app
├── packages/         # Shared libraries consumed by apps
│   ├── authz-rpc/    # Generated cratestack RPC client for accounts/projects/api-keys
│   │                 # (do not hand-edit packages/authz-rpc/generated/ — codegen output)
│   ├── api-rest/     # Generated REST client for the Usage API only (do not hand-edit)
│   ├── api-native/   # Native API client utilities
│   ├── hooks/        # Shared React hooks (auth, usage, projects, etc.)
│   ├── i18n/         # Internationalisation resources
│   └── ui/           # Shared design-system components
├── openapi/          # OpenAPI spec for the Usage API only
│   └── usage.backend.yaml
└── docs/
    └── knowledge/    # Agent-readable knowledge base (this directory)
```

The AuthZ API (accounts/projects/api-keys) has no OpenAPI spec — it's schema-first cratestack RPC.
Its source of truth is `packages/authz-rpc/schema/authz.cstack` (copied from the backend repo),
turned into the generated client under `packages/authz-rpc/generated/` by the official
`cratestack generate-typescript` CLI (`cratestack-cli`, a Rust binary — not an npm dependency).
`generated/` is gitignored, same as every other package's codegen output (e.g. `api-rest`'s
`src/client/`) — it's a build artifact, not source. Regenerate it locally with
`pnpm --filter @lightbridge/authz-rpc codegen:cratestack`; CI (`test.yml`, `docker-image.yml`)
installs a cached `cratestack-cli` (pinned to `0.4.16`) and runs the same command before
tests/build.

Since `cratestack-cli` 0.4.14 (issue #182), the generated runtime accepts a composable
`links?: RpcLink[]` interceptor chain, threaded through as `AuthzRpcRuntimeOptions.links`
(`packages/authz-rpc/src/runtime.ts`). `@cratestack/api`'s `createBatchLink()` plugs into it —
an automatic scheduler that collapses concurrent unary calls into one `POST /rpc/batch` request —
and is exercised in `packages/authz-rpc/src/runtime.test.ts`, but **is not wired into the app
root** (`apps/self-service/src/app/_layout.tsx`'s `useAuthzRpcClient(config)` call omits `links`).
Activating it end-to-end is tracked separately
([converse-frontends#120](https://github.com/ADORSYS-GIS/converse-frontends/issues/120)); the
backend RBAC gate for `POST /rpc/batch` was fixed to authorize per-frame in
[lightbridge-authz#157](https://github.com/ADORSYS-GIS/lightbridge-authz/issues/157).

**Rule:** Never place application-specific business logic in `packages/`. Packages export reusable, app-agnostic code only.

---

## Application Layering

Within `apps/self-service/src/`, follow this strict layering:

| Layer          | Directory                                                                        | Responsibility                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Routes**     | `src/app/`                                                                       | Expo Router file-based routes. Thin — only renders the corresponding Screen.                                                      |
| **Screens**    | `src/screens/`                                                                   | Assembles Views. May select which View to show but contains no business logic.                                                    |
| **Views**      | `src/views/`                                                                     | Presentational components. Calls hooks for data; renders UI. Contains layout logic.                                               |
| **Hooks**      | `packages/hooks/`                                                                | All data fetching, state management, and business logic. No JSX.                                                                  |
| **API Client** | `packages/authz-rpc/` (accounts/projects/api-keys), `packages/api-rest/` (usage) | Auto-generated. Never edit by hand — `packages/authz-rpc/generated/` and `packages/api-rest/src/client/` are both codegen output. |

**Dependency direction:** Routes → Screens → Views → Hooks → API Client

**Example chain for the Usage feature (REST):**

```
app/(tabs)/usage.tsx          → renders <UsageScreen />
screens/usage-screen.tsx      → renders <UsageView />
views/usage-view.tsx          → calls hooks, renders UI
packages/hooks/src/usage.ts   → calls queryUsage()
packages/api-rest/            → generated HTTP client (OpenAPI)
```

**Example chain for the API Keys feature (cratestack RPC):**

```
app/api-keys/new.tsx                → renders <ApiKeyCreateScreen />
screens/api-key-create-screen.tsx   → renders views, assembles state
views/api-key-create-view.tsx       → calls hooks, renders UI
packages/hooks/src/api-keys.ts      → calls client.procedures.createApiKey({ args })
packages/authz-rpc/                 → generated RPC client (POST /rpc/procedure.createApiKey)
```

---

## UI Rules

All UI must use the shared design system from `packages/ui/`. These rules are **non-negotiable**:

1. **Use `cva` (Class Variance Authority) + `cn` for all styling.** Do not write raw `className` strings outside of `cva`/`cn` calls.
2. **Only use design tokens** from the theme — never hardcode color values, font sizes, or spacing.
3. **Component primitives** (`Text`, `Stack`, `ScreenShell`, etc.) come from `@lightbridge/ui`. Use them; do not re-implement.

---

## Internationalisation (i18n)

All user-visible strings must go through the i18n system:

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// ✅ Correct
<Text>{t('usage.title')}</Text>

// ❌ Wrong — hardcoded text
<Text>Usage</Text>
```

**Rule:** No hardcoded text strings in any component. All copy lives in translation files in `packages/i18n/`.

---

## Naming Conventions

| Subject                      | Convention                          | Example                               |
| ---------------------------- | ----------------------------------- | ------------------------------------- |
| Files (modules, components)  | `kebab-case`                        | `usage-view.tsx`, `auth-storage.ts`   |
| Variables / functions        | `camelCase`                         | `useQueryUsage`, `loadStoredSession`  |
| Types / Interfaces / Classes | `PascalCase`                        | `AuthSession`, `UsageQueryParams`     |
| True constants               | `SCREAMING_SNAKE_CASE`              | `STORAGE_KEY`, `WEB_DB_NAME`          |
| Interface names              | No `I` prefix                       | `UserService`, **not** `IUserService` |
| Boolean variables            | `is`, `has`, `should`, `can` prefix | `isAuthenticated`, `isLoading`        |

**Do not use `_` to denote private members.** Use native JS private fields (`#`) in classes.

---

## TypeScript Rules

- `strict: true` must be enabled. Never disable per-file.
- Do not use `any`. Use `unknown` + type guards.
- Do not use non-null assertions (`!`). Use optional chaining (`?.`) and nullish coalescing (`??`).
- Do not use `@ts-ignore`. Use `@ts-expect-error` with a comment explaining why.
- Prefer `interface` for extensible object shapes; `type` for unions, intersections, and mapped types.

---

## Import Order

Imports must be ordered as follows, separated by blank lines:

1. Node built-ins
2. External packages (`react`, `expo-*`, `@tanstack/*`, etc.)
3. Internal package aliases (`@lightbridge/*`)
4. Relative imports (`./`, `../`)

Use **named exports** over default exports everywhere possible.

---

## React Patterns

- **Functional components only.** No class components.
- Custom hooks must start with `use` and handle **one concern**.
- Do not call hooks conditionally or inside loops.
- Do not make API calls directly inside `useEffect`. Use `@tanstack/react-query` (`useQuery`).
- Use **TanStack Query** for all server state. Never store API responses in global state (Zustand, Context).
- Avoid prop drilling beyond 2 levels — extract a context or use composition.

---

## Existing Usage Feature

**File:** `apps/self-service/src/app/(tabs)/usage.tsx`

**Current state (as of codebase inspection):**

The route delegates to `UsageScreen` → `UsageView`. The current `UsageView` renders a **"coming soon" placeholder** only:

```tsx
// views/usage-view.tsx
export function UsageView() {
  const { t } = useTranslation();
  return (
    <ScreenShell title={t('usage.title')}>
      <Stack gap="sm" align="center" justify="center" flex="grow">
        <Text intent="eyebrow" align="center">
          {t('usage.comingSoon')}
        </Text>
      </Stack>
    </ScreenShell>
  );
}
```

The data-fetching hook (`useQueryUsage` in `packages/hooks/src/usage.ts`) **is** fully implemented and functional, but the view has not yet been wired to display the data. The hook:

- Defaults to `scope = "project"`, last 30 days, `bucket = "1 day"`
- Only fires when a current project is selected and the user is authenticated
- Stores results reactively in `usageCollection` (TanStack DB live store)

**Agent TODO:** When implementing the usage UI, import `useQueryUsage` or `useTokenUsage` from `packages/hooks` in the view, not the screen or route.

---

## Error Handling Rules

- Use typed/structured errors (custom `Error` subclasses with a `code` property).
- Never swallow exceptions silently (no empty catch blocks without at minimum a comment).
- Catch variables must be typed as `unknown` and narrowed before use.
- Always `await` or `.catch()` promises — never floating promises.

---

## Testing

- Test framework: **Playwright** (E2E).
- Unit tests: fast, isolated, no I/O, no network.
- Integration tests: use real component interactions via dedicated test infrastructure.
- 80%+ line coverage target on business logic; 100% on critical paths (auth, payment, validation).
- Test files follow **AAA pattern** (Arrange / Act / Assert).
