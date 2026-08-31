# ADR 0011: URL-first view state via nuqs

## Status

Accepted

> **Amended by [ADR 0013](0013-console-information-architecture-v3.md) (IA v3, 2026-08-31).**
> The account half of scope moved out of the URL **query** and into the URL **path**
> (`/accounts/[accountId]/*`) — see ADR 0013 D1. The project half is unaffected: `?project=`
> stays exactly the query-state pattern this ADR describes, including `clearOnDefault` for the
> "all projects" default. Everything else here — the URL-as-cross-zone-state-bus principle, the
> sanctioned local-state exceptions, `packages/ui-web` staying nuqs-free — is unchanged.

## Context

The console's view state (scope, filters, range/bucket/group-by, row/series selections, active
sub-nav tabs, open section sheets) currently lives in React `useState` inside `apps/console`'s
client providers (`ConsoleScopeProvider`, `ConsoleViewStateProviders`) and per-route adapters.
Consequences: no console view is shareable or reload-stable, back/forward does nothing useful,
and the persistent layout carries provider machinery whose only job is moving state between the
centre and the rail slots.

Owner directive (2026-08-26): avoid `useState`; use **nuqs** instead.

## Decision

1. **All view state is URL state.** Anything that describes *what the user is looking at* lives
   in the URL via nuqs (`useQueryState`/`useQueryStates` with typed parsers + defaults):
   scope (account/project), dashboard view params (range, bucket, group-by), filters, selected
   series/row/request, active sub-nav tab, and which section sheet is open. Every console view
   becomes a shareable, reload-stable, back/forward-navigable URL.
2. **The URL is the cross-zone state bus.** Centre pages and `@rail`/`@scope` slot content read
   the same query params directly; the layout-level state providers that existed only to share
   view state between zones are deleted, not wrapped.
3. **Sanctioned local state (the explicit exceptions).** Ephemeral interaction state stays
   component-local: hover/tooltip tracking, focus management, in-flight form drafts whose
   content must not leak into URLs or history (the typed-confirm text, decision notes before
   submit), and animation/measurement state. Each surviving `useState`/`useRef`-state in
   `apps/console` carries a one-line justification comment; new unexplained `useState` in view
   code is a review defect.
4. **`packages/ui-web` stays presentational and framework-agnostic.** Components do not import
   nuqs; they stay controlled via props/callbacks so the app can own their state in the URL.
   Internal uncontrolled conveniences must always offer the controlled form.
5. Defaults stay out of the URL (nuqs `clearOnDefault`, the default), writes that shouldn't
   spam history use `history: 'replace'`, and high-frequency updates (e.g. text filters) use
   nuqs throttling. Server components may read the same params via nuqs' server-side cache
   helpers where useful.
6. Theme preference is not URL state — it stays in `localStorage` via the existing mechanism
   (a URL should not restyle the app for whoever it is shared with).

## Consequences

- `nuqs` joins `apps/console`'s dependencies (Next App Router adapter at the root).
- `ConsoleScopeProvider` / `ConsoleViewStateProviders` are deleted; route adapters read query
  state directly. Less code, and the layout's client boundary shrinks.
- Refine hook params (filters/pagination) derive from URL state — refine's own
  `syncWithLocation` stays **off** (nuqs owns the URL contract; one writer).
- Stories/tests: ui-web is unaffected (presentational); `apps/console` tests use nuqs' testing
  adapter.
- URLs become part of the product surface: param names are a contract; renames need the same
  care as API fields.

## Alternatives considered

- **Keep provider-based state.** Rejected by the directive, and it forfeits shareable views.
- **Roll our own searchParams plumbing.** Rejected: nuqs is the established, typed, SSR-aware
  implementation of exactly this pattern; hand-rolling it is the kind of code this project
  exists to not write.
