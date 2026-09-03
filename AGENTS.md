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

---

## 0. Start here — skills, agents, and the knowledge base

**This file is the single entry point.** Whatever harness you are running in, everything below is
reachable from here. `.github/copilot-instructions.md`, `GEMINI.md` and `.cursorrules` are committed
symlinks to this file; `.agents/skills/*` are committed symlinks to `.claude/skills/*`. Nothing is
duplicated — see [`docs/knowledge/agent-harnesses.md`](docs/knowledge/agent-harnesses.md) for the
link map and the Windows `core.symlinks` note.

### Skills — `.claude/skills/<name>/SKILL.md`

Read the one that matches your task **before** starting it. Each carries the exact commands, the
verification bar, and the pitfalls that have actually cost time here.

| Skill                                                                                            | Read it when                                                                           |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `console-ui`                                                                                     | Building or restyling anything in `packages/ui-web` or `apps/console` — **binding**    |
| `dashboard-panel`                                                                                | Adding, changing or removing a panel on any `/admin/*` or `/settings/overview/*` board |
| `console-story-verify`                                                                           | Any UI change that someone needs to SEE before it merges                               |
| `i18n-copy`                                                                                      | Any user-visible string, translation, or a failing i18n test                           |
| `report-template`                                                                                | A `.typ` template, a PDF export, or a `422` compile error                              |
| `authz-schema-sync`                                                                              | A new or changed RPC procedure, `authz.cstack`, or stale `generated/` types            |
| `console-release-verify`                                                                         | "Is it live?" — the image, the write-back, ArgoCD, the live probes                     |
| `governance-pr`                                                                                  | Opening, describing or merging a PR                                                    |
| `ci-cd`, `containerization`, `debugging`, `documentation`, `pr-review`, `refactoring`, `testing` | Generic workflows                                                                      |

### Agents — `.claude/agents/<name>.md`

| Agent                | Use for                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `console-ui-builder` | Implementing `packages/ui-web` components and `apps/console` screens        |
| `dashboard-author`   | `dashboards.yaml` entries and panels — YAML, not components                 |
| `console-verifier`   | **Read-only** verification of a change or a claim of "done"                 |
| `docs-curator`       | Writing or repairing docs with verified citations and parsing mermaid pairs |

### Knowledge base — `docs/knowledge/`

Contracts and how-tos. **Decisions and their alternatives live in `docs/adr/`** — these pages link
the ADRs rather than restating them.

| Page                                                             | Covers                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `architecture.md`                                                | What this repository is, the apps, the dependency graph             |
| `dashboards.md`                                                  | The `dashboards.yaml` contract, the engine, dedupe, panel types     |
| `export-pipeline.md`                                             | `/api/reports/page`, Typst templates, the sidecar, CSV              |
| `admin-area.md`                                                  | Every `/admin/*` screen and its permission, and the honest captions |
| `sessions-and-access.md`                                         | The session seal, TTL, rotation, chunks, and the `can()` gate       |
| `authorization-and-permissions.md`                               | The full gate table and the server-side boundary                    |
| `i18n.md`                                                        | Adding a string, adding a language, the ratchets                    |
| `budget-schedules.md`                                            | Reset schedules, and ceiling vs reset period                        |
| `comparison-windows.md`                                          | What `compare: true` adds, and why the picked window never moves    |
| `console-configuration.md`                                       | `config.yaml`, every key, the config volume, secret rotation        |
| `observability.md`                                               | OpenTelemetry traces and the build stamp                            |
| `release-and-rollout.md`                                         | Merge → image → image-updater → ArgoCD → live, and how to check     |
| `ci-cd.md`, `infrastructure.md`, `runbooks.md`                   | The pipelines, the cluster, the incident procedures                 |
| `rpc-and-codegen.md`, `api-reference.md`, `api-usage-backend.md` | The backends and their clients                                      |
| `agent-harnesses.md`                                             | How every harness reaches these files                               |

### The commands, once

```sh
pnpm install                                        # postinstall runs codegen
pnpm -r typecheck
pnpm -r test
pnpm --filter console build:web                     # the REAL Next build (`build` is not a script)
pnpm --filter @lightbridge/ui-web build-storybook
pnpm lint                                           # eslint + prettier -c
pnpm format                                         # write mode
```

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
2. **Hosted-login app layer (`apps/authz-ui/src`)** — the human plane of `lightbridge-authz`'s
   `authz-idp`, rendering its live RFC 8628 device-pairing flow (`lightbridge-authz` #478,
   converse-frontends#409), not a placeholder:
   - A **Vite static SPA** — React 19 + react-router, no Next.js, **no server code of any kind**.
     Built with Vite `base: "/ui/"` to a plain `dist/`, which `lightbridge-authz`'s `authz-idp`
     serves same-origin under its `/ui` path prefix (ADR-0021 Decisions 1 and 10). This repo owns
     the build; that repo owns the serving, the caching headers and the CSP.
   - **The route set is declared once**, in `src/routes/route-table.ts` (`/`, `/device`,
     `/device/invalid`, `/device/confirm`, `/device/success`, `/error` — no catch-all). The Vite
     build emits `dist/routes.json` from that table; `authz-idp` reads it at startup as the `/ui`
     route allowlist and 404s everything else (lightbridge-authz#598). Adding or renaming a route
     is therefore a **two-repo change**: edit the table (+ a `pages-stories/` story, which lands
     _before_ the route) here, merge, get a new published digest, then bump the pin (and any
     Rust-side redirect) in `lightbridge-authz` in the same review pass. `vite dev` has no
     allowlist, so a route can work locally and still 404 in production if the manifest drifts.
   - It shares **one style pipeline** with the console: its whole CSS entry is
     `@import '@lightbridge/ui-web/styles.css'`. Unlike the console, `packages/ui-web/src/theme.css`
     carries **no** `@source` line for this app's `src` — Vite-root automatic content detection
     already covers it (see `theme.css`'s own comment and `apps/authz-ui/README.md`'s "Stack"
     section for why one was tried and removed as redundant). Semantic tokens only — same rules,
     same `console-ui` skill.
   - **The CSP is load-bearing here in a way it is not for the console**: `authz-idp` serves every
     `/ui` response with `default-src 'self'; frame-ancestors 'none'` — no `'unsafe-inline'`, no
     nonce, no hash, and (owner decision, converse-frontends#407) no `data:` carve-out. No inline
     `<script>`, no inline `style=`, no daisyUI component class (or a `ui-web` component that
     renders one) will load. Five source/DOM/build-output gates enforce this — see the
     `console-ui` skill's CSP-safe-sections note and `apps/authz-ui/README.md`'s "CSP posture" for
     the full list. The console's pre-hydration theme script therefore has no counterpart here;
     see that app's README for what replaces it.
3. **Loopback callback page (`apps/governance-auth/src`)** — the terminal-facing page a browser
   lands on after `lightbridge-governance`'s OAuth2 **loopback** redirect (tells the user whether
   their terminal got a session, then "gets out of the way"):
   - A **Vite + React 19 static page**, no router, no server code, no i18n. It is **not** a
     sibling of the `authz-ui`/`authz-idp` serving model: the build output is exactly **one
     self-contained `index.html`** (`vite-plugin-singlefile`, `base: './'`, `assetsInlineLimit`
     maxed) that the Rust side `include_str!`s at **compile time** and writes to a loopback socket
     bound to `127.0.0.1` — no origin, no CDN, and the machine may be offline.
   - **There is no CSP at all**, because nothing serves it — the middle case on the CSP spectrum
     between the console (inlines its theme script) and `authz-ui` (CSP forbids inline).
   - **It ships as an OCI artifact, not a container image**: `governance-auth-callback-oci.yml`
     publishes `dist/index.html` (via `oras`) to `ghcr.io/adorsys-gis/governance-auth-callback`,
     pinned by full `sha-<40-char>` (the `latest` tag is called out as a footgun — it moves on
     every `main` merge). `lightbridge-governance`'s `scripts/vendor-callback-page.sh <sha>`
     consumes it; a single string replacement on `data-callback-status="…"` drives the
     success/error rendering.
   - It composes **only existing `packages/ui-web` sections** (`AuthPanelShell`, `AuthErrorPanel`,
     `InlineStatus`) — no new primitive, no fork, no extension — and shares the same `theme.css`
     token pipeline and two-theme model.
4. **UI layer (`packages/ui-web`)**:
   - DOM component primitives (daisyUI + Base UI + cmdk + Floating UI, per ADR 0010) and screen
     sections (`src/sections/`). Also the shared theme-resolution module (`src/lib/theme.ts`),
     promoted here when a second app needed the same `black`-default/`wireframe` contract. See the
     `console-ui` skill for the full contract.
5. **RPC layer**:
   - **`packages/authz-rpc`**: cratestack-generated RPC client. **DO NOT HAND-EDIT** `generated/`.
   - **`packages/api-rest`**: Generated REST client for the usage backend (Hey API/OpenAPI). **DO NOT HAND-EDIT.**
6. **Chart math (`packages/chart-core`)**:
   - DOM-free d3 scales/bins/colour-ramp math, consumed by `packages/ui-web`'s SVG chart components.
7. **i18n**: there is **no `packages/i18n`** — it was deleted with the Expo app it served (ADR 0017
   D7). Copy lives in `apps/console/locales/<locale>/<namespace>.json` and is resolved by
   `apps/console/src/i18n/` (per-request server instance, synchronously-seeded client provider).
   `packages/ui-web` owns **no** translations: copy arrives as a prop, or through `useCopy()` with
   an English default. English and German ship today. See
   [`docs/knowledge/i18n.md`](docs/knowledge/i18n.md) and the `i18n-copy` skill. §1's "No Plain
   Visible Text" rule is enforced by a ratchet
   (`apps/console/src/i18n-hardcoded-copy.test.ts`) that pins the number of remaining hard-coded
   strings: it may fall freely, and raising it fails the build.

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
