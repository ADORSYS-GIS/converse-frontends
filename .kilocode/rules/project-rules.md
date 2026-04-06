# Converse-frontends

## Tech Stack
- **Languages:** typescript,javascript
- **Frameworks:** react
- **Package Managers:** npm,pnpm
- **Test Frameworks:** playwright

## Repository Structure
```
monorepo
```

## Core Principles

- Write clean, readable code. Favor clarity over cleverness.
- Every change must leave the codebase better than you found it.
- Security is non-negotiable. Follow OWASP guidelines for all user-facing code.
- Never commit secrets, API keys, tokens, or credentials. Use environment variables and secret managers.
- All public APIs must have input validation and proper error handling.
- Prefer composition over inheritance. Favor small, focused functions.

## Git Conventions

### Commits
- Use Conventional Commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Scope is optional but encouraged (e.g., `feat(auth): add OAuth2 flow`)
- Subject line: imperative mood, lowercase, no period, max 72 characters
- Body: explain *why* the change was made, not *what* changed (the diff shows that)

### Branches
- Feature: `feat/short-description` or `feat/TICKET-123-short-description`
- Bugfix: `fix/short-description`
- Hotfix: `hotfix/short-description`
- Release: `release/vX.Y.Z`

### Pull Requests
- PRs must have a clear description of changes and motivation
- All CI checks must pass before merge
- Require at least one approving review
- Keep PRs small and focused; split large changes into stacked PRs
- Link related issues using `Closes #123` or `Fixes #123`

## Code Review Standards

- Review for correctness, security, performance, and readability in that order
- Check for proper error handling and edge cases
- Verify test coverage for new and changed code
- Flag any hardcoded values that should be configurable
- Ensure naming is clear and consistent with the codebase
- Look for potential race conditions in concurrent code

## Error Handling Philosophy

- Fail fast and fail loudly in development; fail gracefully in production
- Use typed/structured errors, not raw strings
- Always log errors with sufficient context for debugging (timestamp, request ID, stack trace)
- Never swallow exceptions silently
- Distinguish between recoverable and unrecoverable errors
- Return meaningful error messages to API consumers (without leaking internals)

## Documentation Expectations

- Public functions and APIs must have doc comments explaining purpose, parameters, return values, and thrown errors
- Complex business logic must have inline comments explaining *why*, not *what*
- Keep README up to date when adding features, changing setup steps, or modifying architecture
- Document breaking changes prominently in changelogs
- Architecture decisions should be recorded in ADRs (Architecture Decision Records) when significant

## TypeScript Conventions

### Naming
- Variables and functions: `camelCase`
- Classes, interfaces, types, enums: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for derived values
- Files: `kebab-case.ts` for modules, `PascalCase.ts` for classes/components
- Interfaces: do NOT prefix with `I` (use `UserService`, not `IUserService`)
- Type parameters: single uppercase letter (`T`, `K`, `V`) or descriptive (`TResult`, `TInput`)

### Type Safety
- Enable `strict: true` in tsconfig.json — never disable it per-file
- Avoid `any`; use `unknown` when the type is truly unknown, then narrow with type guards
- Prefer `interface` for object shapes that may be extended; use `type` for unions, intersections, and mapped types
- Use discriminated unions over optional fields for state modeling
- Leverage `as const` for literal types and `satisfies` for type-checked assignments
- Never use non-null assertions (`!`) unless you have a provable guarantee; prefer optional chaining (`?.`) and nullish coalescing (`??`)

### Imports and Modules
- Use ES module syntax (`import`/`export`), never CommonJS (`require`) in `.ts` files
- Order imports: (1) node built-ins, (2) external packages, (3) internal aliases, (4) relative imports — separated by blank lines
- Use path aliases (e.g., `@/`) instead of deep relative imports (`../../../`)
- Prefer named exports over default exports for better refactoring and tree-shaking
- Co-locate types with the module that owns them; shared types go in a `types/` directory

### Error Handling
- Use custom error classes that extend `Error` with a `code` property for programmatic handling
- Prefer `Result<T, E>` patterns or discriminated unions for expected failure paths
- Use try/catch only for truly exceptional situations
- Always type catch variables as `unknown` and narrow before use

### Patterns and Idioms
- Use `readonly` for properties and arrays that should not be mutated
- Prefer `Map`/`Set` over plain objects for dynamic key collections
- Use `enum` sparingly; prefer `as const` objects with derived union types
- Leverage template literal types for string validation where applicable
- Use generics to avoid code duplication, but keep them simple — no more than 2-3 type parameters

### Common Pitfalls
- Do not use `==`; always use `===`
- Avoid floating promises — always `await` or explicitly handle with `.catch()`
- Never mutate function parameters; return new values
- Avoid `Object.assign` for cloning; use spread or `structuredClone`
- Beware of `this` context loss in callbacks — use arrow functions or explicit binding
- Do not use `@ts-ignore`; use `@ts-expect-error` with a comment explaining why

## JavaScript Conventions

### Naming
- Variables and functions: `camelCase`
- Classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` for true compile-time constants, `camelCase` otherwise
- Files: `kebab-case.js` for modules, `PascalCase.js` for classes/components
- Private methods/properties: prefix with `#` (native private fields), not `_`
- Boolean variables: prefix with `is`, `has`, `should`, `can` (e.g., `isActive`, `hasPermission`)

### Module Organization
- Use ES modules (`import`/`export`) over CommonJS (`require`/`module.exports`) in new code
- Order imports: (1) node built-ins, (2) external packages, (3) internal modules, (4) relative — separated by blank lines
- Prefer named exports for discoverability; use default exports only for main module entry points
- Keep files under 300 lines; extract when a file handles multiple responsibilities

### Error Handling
- Always handle promise rejections — unhandled rejections crash Node.js
- Use `try/catch` around `await` calls or attach `.catch()` handlers
- Throw `Error` objects (or subclasses), never strings or plain objects
- Validate function inputs early and throw descriptive errors (fail fast)
- Use custom error classes with `name` and `code` properties for programmatic handling

### Patterns and Idioms
- Use `const` by default; use `let` only when reassignment is necessary; never use `var`
- Prefer arrow functions for callbacks and anonymous functions
- Use destructuring for function parameters and return values
- Prefer `Array.prototype` methods (`map`, `filter`, `reduce`) over `for` loops for transformations
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of manual null checks
- Prefer template literals over string concatenation
- Use `Object.freeze()` for configuration objects that must not be mutated

### Async Patterns
- Prefer `async/await` over `.then()` chains for readability
- Use `Promise.all()` for parallel independent operations; `Promise.allSettled()` when partial failure is acceptable
- Never mix callbacks and promises in the same API
- Use `AbortController` for cancellable async operations

### Common Pitfalls
- Always use `===` and `!==`; never `==` or `!=`
- Beware of `this` binding in callbacks — arrow functions inherit `this` from the enclosing scope
- Do not mutate function arguments; clone objects with spread or `structuredClone()`
- Never use dynamic code execution functions — they are security risks
- Beware of floating-point arithmetic: use libraries for financial calculations
- Never rely on object key order for logic (use `Map` for ordered key-value pairs)
- Guard against prototype pollution: validate object keys from user input

## React Conventions

### Project Structure
- Group by feature: `features/auth/`, `features/dashboard/` — each containing components, hooks, utils, and tests
- Shared UI primitives go in `components/ui/`; shared hooks in `hooks/`
- Co-locate tests, styles, and types with their component

### Component Patterns
- Use functional components exclusively; no class components in new code
- Prefer named exports: `export function UserCard()` over `export default`
- Keep components under 150 lines; extract sub-components when complexity grows
- Use `React.memo()` only when profiling shows unnecessary re-renders, not preemptively
- Props interfaces: define with `interface Props` in the same file, not inline

### State Management
- Local state: `useState` for simple values, `useReducer` for complex state logic
- Server state: use React Query / TanStack Query — never store API responses in global state
- Global client state: use Zustand or Context for truly global UI state (theme, auth, toasts)
- Avoid prop drilling beyond 2 levels; extract a context or use composition instead

### Hooks
- Custom hooks must start with `use` and handle one concern
- Never call hooks conditionally or inside loops
- Use `useCallback` for functions passed as props to memoized children; `useMemo` for expensive computations
- Clean up effects: return a cleanup function from `useEffect` for subscriptions, timers, and listeners

### Performance
- Lazy-load routes and heavy components with `React.lazy()` and `Suspense`
- Use virtualization (react-window, tanstack-virtual) for lists over 100 items
- Avoid creating new objects/arrays in render — hoist them or memoize
- Use the React DevTools Profiler to identify bottlenecks before optimizing

### Anti-Patterns to Avoid
- Do not use `useEffect` for state derivation — compute derived values during render
- Do not sync state between components with `useEffect` — lift state up or use a shared store
- Do not put API calls in `useEffect` directly — use a data fetching library
- Avoid index as key in lists where items can be reordered, added, or removed

## Testing Conventions

**Test Frameworks:** playwright

### Test File Naming and Location
- Test files live alongside source files or in a parallel `tests/`/`__tests__` directory — follow the established project convention
- Name test files to match the module they test: `user-service.test.ts`, `test_user_service.py`, `UserServiceTest.java`
- Group integration tests separately from unit tests (e.g., `tests/integration/`, `tests/unit/`)

### Test Structure (AAA Pattern)
- Every test follows **Arrange / Act / Assert**:
  - **Arrange**: Set up test data, mocks, and preconditions
  - **Act**: Execute the single operation under test
  - **Assert**: Verify the expected outcome
- Separate the three sections with blank lines for readability
- Each test should have exactly one reason to fail — test one behavior per test function

### What to Test
- All public API methods and functions
- Business logic and domain rules
- Edge cases: empty inputs, boundary values, null/undefined, max/min values
- Error paths: invalid input, missing data, network failures, permission denied
- State transitions and side effects

### What NOT to Test
- Framework internals or third-party library behavior
- Private methods directly (test through the public interface)
- Trivial getters/setters with no logic
- Auto-generated code (ORM models, protobuf stubs)
- Implementation details that may change without affecting behavior

### Mocking Philosophy
- Mock external dependencies (HTTP clients, databases, file system, third-party APIs)
- Do NOT mock the unit under test or its direct collaborators (prefer real objects)
- Use dependency injection to make mocking straightforward
- Prefer fakes/stubs over complex mock frameworks when possible
- Assert on behavior (was the method called with correct args?) not implementation
- Reset mocks between tests to prevent state leakage

### Coverage Expectations
- Aim for 80%+ line coverage on business logic and domain code
- 100% coverage on critical paths (authentication, authorization, payment, data validation)
- Do not chase 100% coverage everywhere — diminishing returns on glue code and configuration
- Coverage gates in CI should block PRs that reduce coverage on changed files

### Integration vs Unit Test Boundaries
- **Unit tests**: fast, isolated, no I/O, no network, no database — run in milliseconds
- **Integration tests**: test real interactions between components (API routes, database queries, message queues)
- Integration tests use dedicated test databases/containers, not production-like data
- Run unit tests on every commit; run integration tests in CI pipeline
- Use test containers (Testcontainers, Docker Compose) for integration test infrastructure

### Test Quality
- Tests must be deterministic — no flaky tests; fix or quarantine immediately
- Tests must be independent — no reliance on execution order or shared mutable state
- Use descriptive test names that read as specifications: `should return 404 when user not found`
- Use test data builders or factories to reduce boilerplate setup
- Clean up test resources in teardown/afterEach hooks

## Workflow: CI/CD

Use this section when planning, updating, or debugging continuous integration and delivery pipelines.

- Pipelines should be idempotent, fast, and cache-aware; aim for < 10 min CI on main branches.
- Enforce branch protections and required checks. Block merges on red pipelines or low test coverage.
- Separate stages: lint → build → unit tests → integration/e2e → security scans → package → deploy.
- Artifacts must be immutable and traceable to commits; include SBOM where possible.
- Prefer declarative pipeline definitions (YAML) stored in-repo. Review for secrets exposure.
- Add rollback strategies and health checks for every deploy job.
- For GitHub Actions: pin actions by commit SHA, use OIDC to cloud, avoid long‑lived secrets.

Checklist
- Linting and type checks run early and fail fast
- Test matrix covers supported OS/versions/runtimes
- Caches scoped correctly; cache keys include lockfiles
- Build artifacts signed or checksummed
- Environments (dev/stage/prod) use the same artifact
- Deployment is atomic and reversible (blue/green, canary, or rolling)

## Workflow: Containerization

Guidance
- Minimal base images; prefer distroless/ubi-micro; run as non-root; drop capabilities.
- One process per container; health checks; graceful shutdown (SIGTERM handling).
- Use multi-stage builds; cache dependencies; pin versions and verify checksums.
- Scan images for vulnerabilities in CI; fail on critical CVEs; track SBOM.
- Resource limits/requests set appropriately; avoid hostPath mounts in prod.

Checklist
- Dockerfile is multi-stage and reproducible
- User set to non-root; no hardcoded secrets
- Healthcheck defined; exposes correct ports
- Image tag follows immutable strategy (commit SHA or semver)
- Image passes vulnerability scan thresholds
