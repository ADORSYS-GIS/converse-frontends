# AGENTS.md — Repository Standards & Work Method

This document is the definitive source of truth for the working method, architecture, and coding standards of the `converse-frontends` repository.

---

## 1. Guiding Principles

- **Monorepo-first**: All code lives in `apps/` or `packages/`. Root contains only workspace tooling.
- **UI Primitives Only**: App screens/views may NOT import from `react-native` directly. Use components from `@lightbridge/ui`.
- **Strict Styling**: Tailwind classes live ONLY in `@lightbridge/ui` via `cva` + `cn`. App pages pass **variants**, never raw `className` strings.
- **Theme Tokens**: Never use hardcoded colors (e.g., `bg-white`, `bg-[#...]`). Use semantic tokens (primary, secondary, ink, surface, etc.) from the Tailwind theme.
- **No Plain Visible Text**: All user-visible text must come from `i18n` using `t('key')`. Literal strings are for logs/internal labels only.
- **Kebab-case Filenames**: All new files and folders must be `kebab-case` (e.g., `api-keys-view.tsx`).
- **Security**: Never commit secrets or credentials. Follow OWASP guidelines. All public APIs must have input validation.

---

## 2. Architecture: 4-Layer MVC

1. **View Layer (`apps/self-service/src`)**:
   - **Routes/Layouts**: Expo Router (`app/`).
   - **Screens/Views**: UI assembly (`screens/`, `views/`). Calls hooks for data. No business logic.
2. **Service Layer (`packages/hooks`)**:
   - Uses **TanStack Query** for caching, mutations, and optimistic updates.
   - Owns TanStack DB collections and backend synchronization.
3. **API Layer**:
   - **`packages/api-rest`**: Generated REST client via Hey API (OpenAPI). **DO NOT HAND-EDIT.**
   - **`packages/api-native`**: Native device/system capabilities (Clipboard, Linking).
4. **i18n Layer (`packages/i18n`)**:
   - Centralized translations and configuration via `react-i18next`.

---

## 3. UI and Navigation Rules

### Component Design
Each UI component in `@lightbridge/ui` must follow this folder structure:
- `cva.tsx`: Define all variants and tailwind classes.
- `types.tsx`: Define props and types.
- `component.tsx`: Implementation (uses `cn()` to merge variants and logic).
- `index.tsx`: Clean exports.

### Navigation (Expo Router)
- Tabs live in `app/(tabs)` and use `Tabs` with `ResponsiveTabBar`.
- Auth routes live in `app/(auth)`.
- Use `Stack`, `Tabs`, `router`, `Link`, and `useLocalSearchParams`.
- Screen titles and tab labels must be translated.

---

## 4. Coding Conventions

### TypeScript & Type Safety
- **Strict Mode**: `strict: true` is mandatory; never disable per-file.
- **No `any`**: Use `unknown` + type guards or **discriminated unions** for state modeling.
- **Literal Types**: Use `as const` for literals and `satisfies` for type-checked assignments.
- **Safety**: Prefer optional chaining (`?.`) and nullish coalescing (`??`) over non-null assertions (`!`).
- **Imports**: (1) Node built-ins, (2) External, (3) Internal aliases, (4) Relative. Use **named exports** exclusively.

### React Patterns
- **Functional Components**: Hooks only. No class components.
- **No derivations in `useEffect`**: Compute derived values during render.
- **No API calls in `useEffect`**: Use TanStack Query exclusively.
- **Optimized Rendering**: Use `React.memo` or `useCallback` only when profiling shows bottlenecks.

### Error Handling
- **Fail Fast**: Loud failures in dev; graceful in production.
- **Typed Errors**: Use custom error classes with `code` properties. Never throw strings.
- **Async**: Always `await` or `.catch()` (no floating promises).

---

## 5. Persistence & Configuration

- **Auth Persistence**: `expo-secure-store` on native and IndexedDB on web (`packages/hooks/src/auth/auth-storage.ts`).
- **Runtime Config (Web)**: Web reads `/config.json` at runtime; native/dev use `EXPO_PUBLIC_*`.
- **TanStack DB**: `localOnlyCollectionOptions` are in-memory. `queryCollectionOptions` wire to backend but do not auto-persist. Explicitly wire persistence if required.

---

## 6. Testing Strategy (AAA)

- **Arrange / Act / Assert**: Every test must clearly separate setup, execution, and verification.
- **What to Test**: Public API methods, business logic, edge cases (empty/null), and error paths.
- **Mocking**: Mock external I/O (API, DB, FS). Do NOT mock the unit under test. Reset mocks between tests.
- **Integration**: Use test containers (Docker Compose) for real interaction tests in CI.

---

## 7. Git & CI/CD Workflow

- **Commits**: Conventional Commits (`type(scope): description`). Subject line max 72 chars.
- **PRs**: Small and focused. Link related issues using `Closes #123`. Require CI pass and approval.
- **CI Pipelines**: Cache-aware, idempotent, and fast (< 10 min).
- **Containerization**: Multi-stage, non-root user, multi-platform (`amd64`/`arm64`).
