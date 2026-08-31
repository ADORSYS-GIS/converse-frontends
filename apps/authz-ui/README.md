# authz-idp hosted login page

Vite + React + TypeScript static build, served same-origin by `authz-idp` under the `/ui` path
prefix (ADR-0021 Decisions 1 and 10 --
`docs/adr/0021-browser-sso-hosted-login-page-and-session-cookie.md`, in `lightbridge-authz`).
This project builds to static assets with Vite `base: "/ui/"`; `authz-idp`'s Rust router serves
them via `tower-http`'s `fs` feature, nested at `/ui`, never at the server root and never a
separate origin (`crates/lightbridge-authz-rest/src/static_assets.rs`) -- see that ADR's
Decision 1 for why same-origin is load-bearing for the `__Host-` session cookie, and Decision 10
for why `/ui` specifically (`GET /` stays `authz-idp`'s own API-welcome-JSON route; the two never
collide).

Lives in `converse-frontends` as `apps/authz-ui`; consumed by `lightbridge-authz`'s `authz-idp` as
a built `dist/` under `/ui`.

## Stack

- **React 19 + TypeScript**, routed with **react-router**. Route set is deliberately minimal
  (`src/app.tsx`) -- exactly one real page today, no invented `/login`/`/authorize`/`/callback`
  routes (those belong to `lightbridge-authz` #424/#425/#441/#443).
- **One style pipeline**: this app's entire CSS entry (`src/index.css`) is a single
  `@import '@lightbridge/ui-web/styles.css'`. `packages/ui-web/src/theme.css` carries no `@source`
  line for this app -- Tailwind v4's automatic content detection, rooted at this app's own Vite
  project root (which contains `src`), already makes this app's class usage visible to that one
  Tailwind pass when this app's own build runs it (verified against a real build; probed
  2026-08-31 -- see `theme.css`'s comment). There is no second `content`/`@source` configuration to
  keep in sync. Token utilities only (`bg-surface`, `text-soft`, `border-border`, ...), never a
  daisyUI component class -- see "Known cost" below and `src/components/notice-panel.tsx`'s own
  comment for why. Headless UI, `cva`, `clsx`, and `tailwind-merge` are dropped in favour of ADR
  0010's primitive stack (Base UI + daisyUI + cmdk + Floating UI) and `@lightbridge/ui-web`'s own
  `cn()`.
- **`vite-plugin-pwa`**, `injectManifest` strategy with a hand-written `src/sw.ts` -- see that
  file's own doc comment for the full reasoning. Short version: this page is served from the
  issuer origin, so a service worker here controls `/oauth2/*`, `/.well-known/*`, `/authorize`,
  and `/healthz` too, not just this page. `src/sw.ts` precaches ONLY the content-hashed
  `assets/**` bundle and registers no other route (no `navigateFallback`, no runtime caching) --
  deliberately stricter than the more common `generateSW` + `navigateFallbackDenylist` pattern,
  because `navigateFallback` is fundamentally a precache-backed (cache-first) mechanism for
  whatever URL it targets, which would mean precaching `index.html` and directly contradicting
  Decision 10's `no-cache` posture for it.

## Theme

`black` (dark) is the default theme, `wireframe` (light) is honored when explicitly chosen or
implied by `prefers-color-scheme` under a `'system'` preference -- the same resolution order as
the console (ADR 0010 Decision 5): stored preference -> `prefers-color-scheme` -> `black`.

`data-theme` is set **statically** in `index.html` (`<html lang="en" data-theme="black">`), not by
an inline bootstrap script, and `src/main.tsx` calls `applyThemePreference(readStoredThemePreference()
?? 'system')` as its first statement, before `createRoot`.

**Why not an inline script, the way the console does it:** `authz-idp`'s
`crates/lightbridge-authz-rest/src/static_assets.rs` serves every response under `/ui` with

```
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
```

-- no `script-src`, so scripts fall back to `default-src 'self'`, which permits no inline script
and carries no nonce or hash. The console's `CONSOLE_THEME_NO_FLASH_SCRIPT` (injected via Next's
`dangerouslySetInnerHTML`) cannot be ported to this surface as-is.

**The residual flash case:** because `black` is the default and is in the markup before the first
byte of CSS is parsed, the common case has zero flash. The one remaining gap is a user who has
explicitly stored `wireframe` (or is on `'system'` with a light OS setting): the module script
that corrects `data-theme` is deferred, so that visitor can see a black frame briefly before the
bundle executes. Closing that gap needs a CSP `script-src` hash coordinated with the Rust side
(`static_assets.rs`); that is cross-repo and out of this story's scope.

## `browserslist` is carried but inert here

The `browserslist` block is copied verbatim from `apps/console/package.json` for parity and as
insurance against a future Lightning CSS transformer, but Vite does not read it today: Vite uses
`build.target` (default `baseline-widely-available`), its default CSS minifier is esbuild (not
Lightning CSS), and Tailwind v4's own optimizer pins its targets internally (chrome 111 / firefox
128 / safari 16.4 -- all `:has()`-native). The real regression gate for browser-target drift is
the `:has(` selector assertion in this app's build verification, not this block.

## PWA / service worker

`vite-plugin-pwa`, `injectManifest` strategy with a hand-written `src/sw.ts` -- see that file's own
doc comment for the full reasoning. Short version: this page is served from the issuer origin, so
a service worker here controls `/oauth2/*`, `/.well-known/*`, `/authorize`, and `/healthz` too,
not just this page. `src/sw.ts` precaches ONLY the content-hashed `assets/**` bundle and registers
no other route (no `navigateFallback`, no runtime caching) -- deliberately stricter than the more
common `generateSW` + `navigateFallbackDenylist` pattern, because `navigateFallback` is
fundamentally a precache-backed (cache-first) mechanism for whatever URL it targets, which would
mean precaching `index.html` and directly contradicting Decision 10's `no-cache` posture for it.

## Known cost

`packages/ui-web/src/theme.css`'s Tailwind pass also auto-detects `packages/ui-web/src` itself and
carries an explicit `@source` line for `apps/console/src` (neither build's automatic detection
reaches those, for reasons documented in `theme.css`'s own comment). This app has no analogous
line and does not need one -- see "One style pipeline" above -- but this app's build is still the
single Tailwind generator that also emits `ui-web`'s own utilities into its output, since it
imports `theme.css` directly. That means this app's built CSS includes utilities it never uses --
the price of "one import, one generator" instead of a per-consumer content list. A prior revision
of this file also carried an `@source '../../../apps/authz-ui/src'` line; a probe (2026-08-31)
proved it redundant for this app's own build and it was removed -- its only observable effect had
been leaking authz-ui-only utilities (e.g. `min-h-dvh`) into the console's and `ui-web`'s Storybook
CSS bundles, not helping this app's own compilation. The measured `dist/assets/*.css` size is
recorded in this story's PR description.

## Scope

This is a scaffold: the static build pipeline, the styling/router/PWA plumbing, and the Rust-side
serving/caching/CSP posture. It does **not** implement the login flow itself:

- the RP leg to Keycloak -- `lightbridge-authz` #424
- `GET /authorize` -- `lightbridge-authz` #425
- session creation / the `__Host-` cookie -- `lightbridge-authz` #441, #443

`src/routes/placeholder-page.tsx` is a deliberately plain placeholder until this surface's visual
direction is decided (`lightbridge-authz` #409).

## Commands

```bash
pnpm install
pnpm --filter authz-ui dev          # http://localhost:5173/ui/ (SW registration is disabled in
                                     # dev -- devOptions.enabled: false in vite.config.ts -- only
                                     # ever verify the service worker against a real production
                                     # build)
pnpm --filter authz-ui build:web    # tsc --noEmit (app) && tsc --noEmit (sw) && vite build &&
                                     # scripts/verify-service-worker-scope.mjs -- production build
                                     # -> dist/ (content-hashed assets/*.js, assets/*.css, sw.js),
                                     # every asset/HTML reference and the service worker's own
                                     # registration prefixed with /ui/ (vite.config.ts's
                                     # base: "/ui/"), then asserts the built service worker only
                                     # precaches assets/** and never intercepts navigation
                                     # (ADR-0021 Decision 10's SW scoping property)
pnpm --filter authz-ui test         # vitest run
pnpm --filter authz-ui typecheck    # tsc --noEmit for both the app and the service worker
```

There is no per-app `lint`/`format`/`check` script -- Biome is gone. Formatting and linting for
this app run through the repo root's `pnpm lint` (ESLint 9 flat config + Prettier), the same as
every other workspace here.

`pnpm --filter authz-ui build:web` is what CI runs (`turbo run build:web` via the root `pnpm
build`, `.github/workflows/test.yml`'s `build-web` job) and what `lightbridge-authz`'s `authz-idp`
container image serves the resulting `dist/` from.
