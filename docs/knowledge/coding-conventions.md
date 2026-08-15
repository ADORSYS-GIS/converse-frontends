# Coding Conventions — Converse-frontends

> Source of truth: `AGENTS.md`, `prettier.config.js`, `eslint.config.js`, `package.json`

---

## Naming Standards

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | `camelCase` | `isLoading`, `scopeId` |
| Functions | `camelCase` | `loadStoredSession`, `buildUsageDashboardUrl` |
| React hooks | `camelCase` prefixed with `use` | `useAuthSession`, `useKeycloakLogin` |
| Classes / Types / Interfaces | `PascalCase` | `AuthSession`, `UsageQueryParams` |
| Enums | `PascalCase` | `ApiKeyStatus` |
| Constants (compile-time) | `SCREAMING_SNAKE_CASE` | `STORAGE_KEY`, `WEB_DB_NAME` |
| Constants (derived/computed) | `camelCase` | `webStore` |
| Boolean variables | `is`, `has`, `should`, `can` prefix | `isAuthenticated`, `hasPermission` |
| Files — modules | `kebab-case.ts` / `kebab-case.tsx` | `auth-storage.ts`, `usage-view.tsx` |
| Files — classes/components | `kebab-case.tsx` (React Native convention) | `usage-view.tsx` |
| Interfaces | No `I` prefix | `UserService` not `IUserService` |
| Type parameters | Single uppercase or descriptive | `T`, `TResult`, `TInput` |
| API endpoints (AuthZ RPC — accounts/projects/API keys, live) | `POST {basePath}/rpc/{op_id}`, not REST. **Corrected from an earlier version of this row**, which showed a REST-style `/api/v1/api-keys/{key_id}` path — that shape predates the cratestack RPC migration (ADR-0003 in `lightbridge-authz`) and no longer exists in this frontend | `POST /api/rpc/model.Account.list` |
| API endpoints (usage REST, currently unused — see `architecture.md`) | Defined by `openapi/usage.backend.yaml` (snake_case path segments) | `/usage/v1/usage/query` |

---

## File Organization

```
converse-frontends/
├── apps/
│   └── self-service/
│       └── src/
│           ├── app/          # Expo Router routes (thin, render screens only)
│           ├── screens/      # Own data fetching (packages/hooks) + sheet presentation (useSheet);
│           │                 # assemble views
│           ├── views/        # Presentational only — render from props; no hook calls, no sheet
│           │                 # imports (see architecture-conventions.md's "Application Layering"
│           │                 # and "Two Load-Bearing Package Contracts" for the corrected rule
│           │                 # and the code-level evidence)
│           ├── configs/      # App-level configuration
│           ├── hooks/        # App-specific hooks (e.g. use-picker-sheet wraps packages/ui's
│           │                 # useSheet; use-theme-colors is local theming logic)
│           ├── navigation/   # Navigation config
│           ├── queries/      # Shared TanStack QueryClient instance (apps/self-service/src/queries/query-client.ts)
│           ├── theme/        # App theme overrides
│           └── types/        # App-specific shared types
├── packages/
│   ├── authz-rpc/            # Generated cratestack RPC client for accounts/projects/api-keys
│   │                         # (do NOT hand-edit packages/authz-rpc/generated/)
│   ├── api-rest/             # Auto-generated REST client (do NOT hand-edit). Currently unused —
│   │                         # nothing in the workspace imports it; see architecture.md
│   ├── api-native/           # Native API utilities
│   ├── hooks/                # Shared hooks (auth, projects, accounts, API keys, budget) —
│   │                         # consumed by screens/, not views/
│   ├── i18n/                 # Translation resources
│   └── ui/                   # Shared design-system components (see design-system-theming.md)
├── openapi/                  # OpenAPI spec for the usage REST API only (currently unused)
├── docs/knowledge/           # Agent-readable knowledge base
└── charts/                   # Helm chart for Kubernetes deployment
```

---

## Code Formatting

- **Formatter:** Prettier `^3.8.1` (`prettier.config.js`)
- **Print width:** 100 characters
- **Indentation:** 2 spaces (`tabWidth: 2`)
- **Quotes:** Single quotes (`singleQuote: true`)
- **Trailing commas:** ES5 style (`trailingComma: 'es5'`)
- **Bracket same line:** `true` (closing bracket on same line for JSX)
- **Plugin:** `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes in `className` attributes)

Run formatter:
```bash
pnpm format
# Runs: eslint --fix + prettier --write on all .js/.jsx/.ts/.tsx/.json/.css/.md files
```

Check without writing:
```bash
pnpm lint
# Runs: eslint check + prettier -c (check mode)
```

---

## Linting

- **Linter:** ESLint `^9.39.2` (`eslint.config.js`)
- **Base config:** `eslint-config-expo/flat` (covers React, React Native, TypeScript rules)
- **Ignores:** `dist/*`, `apps/*/dist/*`
- **Custom rules:**
  - `react/display-name: off` (disabled — display names not required)

---

## Import Ordering

Imports must be ordered as follows, **separated by blank lines**:

1. Node built-ins (e.g., `path`, `fs`)
2. External packages (e.g., `react`, `expo-auth-session`, `@tanstack/react-query`)
3. Internal package aliases (e.g., `@lightbridge/hooks`, `@lightbridge/ui`)
4. Relative imports (e.g., `./auth-types`, `../views/usage-view`)

```typescript
// ✅ Correct
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApiKeys } from '@lightbridge/hooks';

import { useAuthSession } from './auth-session';
```

Corrected from an earlier version of this example, which imported from `@lightbridge/api-rest` —
that package is currently unused by the app (see architecture.md); `@lightbridge/hooks` is a live
internal-package-alias example instead.

Use **named exports** over default exports. Default exports are allowed only for Expo Router route files (framework requirement).

---

## TypeScript Rules

- `strict: true` — always enabled, never disabled per-file
- No `any` — use `unknown` + type guards
- No non-null assertions (`!`) — use `?.` and `??`
- No `@ts-ignore` — use `@ts-expect-error` with a comment
- Prefer `interface` for extensible shapes; `type` for unions/intersections
- Use discriminated unions for state modeling instead of optional fields

---

## Comment Standards

- **Public APIs:** JSDoc comments on exported functions and types explaining purpose, parameters, and return values
- **Complex logic:** Comments explain **why**, not what (the diff shows what)
- **TODOs:** Format as `// TODO(username): description` — never anonymous
- **Deprecated:** Annotate with `@deprecated` and describe migration path
- **`NOTE(context):`** Used for implementation notes that affect maintainers (e.g., `// NOTE(web): avoid idb-keyval default DB/store`)

---

## Commit Message Format

**Conventional Commits:** `type(scope): description`

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Scope: optional (e.g., `feat(auth): add OAuth2 flow`)
- Subject: imperative mood, lowercase, no period, max 72 characters
- Body: explain **why**, not what

---

## Code Review Checklist

- [ ] Tests included for new functionality
- [ ] No hardcoded secrets, API keys, tokens, or credentials
- [ ] Error handling is appropriate and typed (no swallowed exceptions)
- [ ] No `any` types introduced
- [ ] All user-visible strings go through `t('key')` — no hardcoded text
- [ ] New components use `cva`/`cn` and design tokens — no raw `className` strings
- [ ] Documentation updated if behavior has changed
- [ ] Imports ordered correctly and use named exports
- [ ] No floating promises (every `await` or `.catch()` is present)
