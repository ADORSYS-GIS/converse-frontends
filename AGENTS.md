# AGENTS.md — Repository Standards & Work Method

This document is the definitive source of truth for the working method, architecture, and coding standards of the `converse-frontends` repository.

---

> **2026-08-31 (#368):** the Expo/React-Native surface this document originally described
> (`apps/self-service`, `packages/ui`) was removed in a hard cutover — see ADR 0009 for why and
> ADR 0009's status amendment for what landed. Sections 1–3 below are rewritten for the surface
> that replaced it: the Next.js console (`apps/console`) and its DOM component package
> (`packages/ui-web`). Detailed UI/component rules now live in the `console-ui` skill
> (`.claude/skills/console-ui/SKILL.md`) — this document stays high-level and defers to it rather
> than duplicating it.

## 1. Guiding Principles

- **Monorepo-first**: All code lives in `apps/` or `packages/`. Root contains only workspace tooling.
- **UI Primitives Only**: `apps/console` screens/containers may NOT hand-roll DOM markup for anything a `packages/ui-web` primitive already covers. Use components from `packages/ui-web`.
- **Strict Styling**: Tailwind classes live ONLY in `packages/ui-web` via `cva` + `cn`. App pages pass **variants**, never raw `className` strings. Colour is Tailwind semantic tokens only — see the `console-ui` skill's token table; never a hex literal outside `packages/ui-web/src/theme.css`.
- **No Plain Visible Text**: All user-visible text must come from `i18n` using `t('key')`. Literal strings are for logs/internal labels only.
- **Kebab-case Filenames**: All new files and folders must be `kebab-case` (e.g., `api-keys-view.tsx`).
- **Security**: Never commit secrets or credentials. Follow OWASP guidelines. All public APIs must have input validation.

---

## 2. Architecture

1. **Console app layer (`apps/console/src`)**:
   - **Routes**: Next.js App Router (`src/app/`) — server components, route handlers, and the
     session-decrypting auth boundary.
   - **Containers**: `src/containers/` — data-fetching/orchestration, wired to refine.dev resources
     and `@lightbridge/hooks`' dependency-free subpath exports (e.g. `@lightbridge/hooks/api-error`,
     `@lightbridge/hooks/budget-tiers`). No business logic in routes.
   - **Server**: `src/server/` — cookie-session auth (`session.ts`, `session-store.ts`,
     `tokens.ts`, `oidc.ts`), never exposed to the client bundle.
2. **Hosted-login app layer (`apps/authz-ui/src`)**:
   - A **Vite static SPA** — React 19 + react-router, no Next.js, **no server code of any kind**.
     Built with Vite `base: "/ui/"` to a plain `dist/`, which `lightbridge-authz`'s `authz-idp`
     serves same-origin under its `/ui` path prefix (ADR-0021 Decisions 1 and 10). This repo owns
     the build; that repo owns the serving, the caching headers and the CSP.
   - It shares **one style pipeline** with the console: its whole CSS entry is
     `@import '@lightbridge/ui-web/styles.css'`, and `packages/ui-web/src/theme.css` carries an
     `@source` line for its `src`. Semantic tokens only — same rules, same `console-ui` skill.
   - **The CSP is load-bearing here in a way it is not for the console**: `authz-idp` serves every
     `/ui` response with `default-src 'self'; frame-ancestors 'none'` — no `'unsafe-inline'`, no
     nonce, no hash. No inline `<script>`, no inline `style=`, no `data:` URI will load. The
     console's pre-hydration theme script therefore has no counterpart here; see that app's
     README for what replaces it.
3. **UI layer (`packages/ui-web`)**:
   - DOM component primitives (daisyUI + Base UI + cmdk + Floating UI, per ADR 0010) and screen
     sections (`src/sections/`). Also the shared theme-resolution module (`src/lib/theme.ts`),
     promoted here when a second app needed the same `black`-default/`wireframe` contract. See the
     `console-ui` skill for the full contract.
4. **RPC layer**:
   - **`packages/authz-rpc`**: cratestack-generated RPC client. **DO NOT HAND-EDIT** `generated/`.
   - **`packages/api-rest`**: Generated REST client for the usage backend (Hey API/OpenAPI). **DO NOT HAND-EDIT.**
5. **Chart math (`packages/chart-core`)**:
   - DOM-free d3 scales/bins/colour-ramp math, consumed by `packages/ui-web`'s SVG chart components.
6. **i18n layer (`packages/i18n`)**:
   - Centralized translations and configuration via `react-i18next`. Note: `apps/console` imports
     it nowhere today, so §1's "No Plain Visible Text" rule currently describes an intent rather
     than the state of the web surface.

`packages/hooks` and `packages/api-native` still exist but carry React-Native-only surface (auth
session, Keycloak login, native clipboard/haptics) that predates the console and has no current
importer — see the orphan-audit note left on PR #368 before adding new code there; check whether
it's still the right home first.

---

## 3. UI and Navigation Rules

Component structure, the daisyUI/Base UI primitive stack, the two-theme (`black`/`wireframe`)
model, and screen-section conventions are owned by the `console-ui` skill
(`.claude/skills/console-ui/SKILL.md`) — read it before touching anything in `packages/ui-web` or
`apps/console`. Do not re-derive these rules here; if the skill and this file ever disagree, the
skill wins and this file needs fixing.

- Routes live under `apps/console/src/app/`, Next.js App Router conventions (`layout.tsx`,
  `page.tsx`, `loading.tsx`, route groups).
- Screen titles and labels must be translated.

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

- **Auth Persistence**: server-side, HTTP-only session cookie — see `apps/console/src/server/session.ts` and `session-store.ts`. No token ever reaches the client bundle. See ADR 0009 Decision 2.
- **Runtime Config**: `apps/console`'s own server-side config loader (`apps/console/src/server/config-loader.ts` / `env.ts`) — not the old `/config.json` runtime-fetch or `EXPO_PUBLIC_*` mechanism.
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

<!-- ai-governance:stanza -->
<!-- BEGIN: AI Governance stanza (managed by ADORSYS-GIS/ai-governance) -->

## AI Governance

AI may accelerate the work, but humans own intent, verification, and consequences.
AI output is not truth: review AI-generated code as untrusted, and never submit work you cannot explain.

When opening issues or pull requests in this repo:

- Use the provided **issue forms** (Epic, User Story, Dev Ticket) and the **pull request template** — do not open blank issues/PRs.
- Fill in the **AI Usage Declaration** honestly (what AI was used for, what you verified).
- Include a **source-of-truth link** (a URL or `#123` reference). No source of truth means the work is not ready.
- Provide **verification evidence** (commands, logs, links, or checked verification boxes). No evidence means it is not done.

Source of truth and full doctrine: https://adorsys-gis.github.io/ai-governance/
This stanza is intentionally thin — read the site; do not duplicate the doctrine here.
<!-- END: AI Governance stanza -->
