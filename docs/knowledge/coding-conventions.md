# Coding Conventions — Converse-frontends

> Source of truth: `AGENTS.md`, `prettier.config.js`, `eslint.config.js`, `package.json`

---

## Naming Standards

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | `camelCase` | `isLoading`, `scopeId` |
| Functions | `camelCase` | `loadStoredSession`, `useQueryUsage` |
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
| API endpoints | Defined by OpenAPI spec (snake_case path segments) | `/api/v1/api-keys/{key_id}` |

---

## File Organization

```
converse-frontends/
├── apps/
│   └── self-service/
│       └── src/
│           ├── app/          # Expo Router routes (thin, render screens only)
│           ├── screens/      # Assemble views; no business logic
│           ├── views/        # Presentational; calls hooks, renders UI
│           ├── configs/      # App-level configuration
│           ├── hooks/        # App-specific hooks (wrap package hooks)
│           ├── navigation/   # Navigation config
│           ├── queries/      # Query key factories
│           ├── theme/        # App theme overrides
│           └── types/        # App-specific shared types
├── packages/
│   ├── api-rest/             # Auto-generated REST client (do NOT hand-edit)
│   ├── api-native/           # Native API utilities
│   ├── hooks/                # Shared hooks (auth, usage, projects, accounts, API keys)
│   ├── i18n/                 # Translation resources
│   └── ui/                   # Shared design-system components
├── openapi/                  # OpenAPI specs — source of truth for backend
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

import { usageBackendQueryUsage } from '@lightbridge/api-rest';

import { useAuthSession } from './auth-session';
```

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
