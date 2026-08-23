# ADR 0008: Console shell inversion, breakpoints, nav spine, and visual direction

## Status

Accepted

## Context

The self-service app **is** the admin surface — there is no separate admin app, and none will be
built. The owner is bringing the frontend in-house alongside data and procedures, and revamping it
end to end: layout, navigation, and visual language.

As of this ADR, verified directly against the tree at `apps/self-service` and `packages/ui`:

- **Layout is a single boolean breakpoint.** `packages/ui/src/hooks/use-is-desktop.ts` compares
  `useWindowDimensions().width` against `designTokens.breakpoint.desktop` (`1024`,
  `packages/ui/src/design/tokens.ts`) — desktop or not, nothing in between, and no `≤600`
  guard rail exists.
- **Navigation is a bottom-tab / desktop-rail pattern, not the floating-panel shell this ADR
  adopts.** `apps/self-service/src/navigation/responsive-tab-bar.tsx` renders a `NavContainer`
  (`placement="sidebar"` on desktop, `placement="bottom"` otherwise) around `NavItem`s. Routes come
  from `apps/self-service/src/navigation/tab-routes.ts`: `home`, `api-keys`, `usage`, `settings` —
  four items, no role gating, and no group named `Manage` or `Admin`. The `usage` tab is already
  conditionally hidden (`isHiddenRoute` in `responsive-tab-bar.tsx`) unless an operator points the
  app at Grafana via `EXPO_PUBLIC_GRAFANA_URL`/`config.json`'s `usage` key — confirming today's
  usage surface is a Grafana link-out, not an in-app dashboard. No usage-query hook exists yet
  (`packages/hooks/src` has no `usage.ts`).
- **Role/permission plumbing already exists and is reusable.** `packages/hooks/src/rbac.ts` defines
  `ALL_PERMISSIONS`, a role → grant map, and a `lightbridge-admin` role carrying the bare `'*'`
  grant. `project_members` roles (`lead`/`member`) are already threaded through
  `packages/hooks/src/projects.ts` and `apps/self-service/src/views/settings/project-settings-view.tsx`.
  This is the seam the new `Admin` nav group gates on — no new permission model is needed.
- **Self-service budget refill already exists.** `useRequestBudgetRefill`
  (`apps/self-service/src/screens/budget-refill-screen.tsx`,
  `apps/self-service/src/views/settings/budget-refill-view.tsx`) calls `requestBudgetRefill` today,
  reading the offered amount tiers live from the active policy. An admin review queue also already
  exists (`apps/self-service/src/screens/budget-review-screen.tsx`). Both are currently reached
  through Settings, not from a consumption dashboard.
- **No charting dependency is present anywhere in the workspace.** `grep`ing every `package.json`
  in the repo for `d3-scale`, `d3-shape`, `react-native-svg`, `victory`, `recharts`, and
  `*-chart-kit` returned nothing.
- **`packages/ui` currently ships ~40 component directories** under `packages/ui/src/components/`
  (avatar, badge, button, card, chip, confirm-dialog, data-card, date-field, div, divider,
  empty-state, form-field, heading, icon, image, key-value, list-row, lottie, nav-container,
  nav-item, page, page-header, pagination, picker, scroll, section-card, segmented-control, select,
  sheet, skeleton, spinner, stack, stat-card, text, text-field, toolbar) plus the `forms/` layer —
  a CVA + CSS-variable system (`docs/knowledge/design-system-theming.md`, ADR 0007). None of them
  are a floating side-panel, a bottom sheet used as a breakpoint fallback, or a chart primitive —
  all net-new work this ADR's decisions imply.
- App versions in play: `expo@^57.0.0`, `react-native@0.86.2`, `react-native-web@^0.21.2`
  (`apps/self-service/package.json`).

This ADR records the shell, breakpoint, navigation, and visual-direction decisions the owner made
in conversation for that revamp, plus the follow-up work they imply. It intentionally bundles
several related decisions in one document rather than one ADR each, because they are one coherent
redesign brief and were decided together.

## Decision

### 1. No mobile target; iPad-shaped, landscape forced

The app has never been built for phones and will not be. Orientation is locked to landscape.

### 2. Breakpoints

- `≥1024` — full shell.
- `600–1024` — compact.
- `≤600` — unsupported guard rail, not a design target.

Consequence worth stating explicitly: because landscape is forced, a phone in landscape is
~930pt wide and lands in **compact**, not the unsupported band — so phones stay usable without
ever being a design target in their own right. The `≤600` band exists only so nothing looks
actively broken; it is not styled to a standard.

This replaces the current single `≥1024` boolean in `designTokens.breakpoint` with three tiers.

### 3. Shell layout — the inversion

- **Left** — menus in a floating panel, no borders, not too wide; multiple panels can stack inside
  it.
- **Centre** — content sits directly on the page floor, not inside a card or container.
- **Right** — headers/configs/params/filters/knobs for the centre content, in a panel, no borders,
  not too wide.

The inversion is the distinctive part: conventionally, chrome is bordered and content lives in
cards. Here **content is the floor and chrome floats above it**. Separation between panel and floor
comes from tone and elevation — never lines. Charts render uncontained on the floor so they read as
part of the console, not as widgets pasted onto a page.

Responsive behavior:

- `600–1024` (compact): left persists, centre widens, right becomes a bottom sheet.
- `≤600`: left collapses to bottom navigation.

This replaces the current `NavContainer` sidebar/bottom-tab pattern in
`responsive-tab-bar.tsx` — that component's `placement="sidebar" | "bottom"` split is the closest
existing primitive but implements neither the floating-panel-over-floor separation nor the
right-hand config panel this ADR calls for.

### 4. Navigation spine — four groups, one role-gated

`Overview · Api-Keys · Manage · Admin`, where **Admin renders only for a user holding that role**
(the existing `lightbridge-admin` role in `packages/hooks/src/rbac.ts`). A non-admin sees three
items; an admin sees four.

This is an information-architecture constraint, not a styling choice: every screen must nest inside
one of these four groups. It replaces the current flat `home / api-keys / usage / settings` list in
`tab-routes.ts` — `usage` folds into `Overview`'s dashboards (Decision 7), `settings` splits across
`Manage` (project/API-key/account configuration) and `Admin` (budget review, anything gated on
`lightbridge-admin`).

### 5. Visual direction — reference lock

Primary reference: **Axiom** (axiom.co, dark observability console). Preserve:

- Near-black canvas with tonal surface layers: `#000` floor → `#111` header/nav → `#191919`
  floating panels.
- Monospace-primary type for all numerics.
- A single accent, `#DA5C2C`, used for **CTA and active states only — never decoration**.
- 2px radius, near-zero shadow, generous card padding.

Borrow **only** from **Midday** (midday.ai, "achromatic ledger"): the table treatment — hairline
borders, 0px radius, no shadow, elevation via typographic hierarchy — applied to dense money/data
tables only, not the rest of the shell.

Rejected: **Hex**'s serif display + violet accents (softens a console into marketing); any second
vibrant colour; rainbow chart series.

This supersedes the recalibrated-but-still-light-first palette from ADR 0007
(`#3E63DD` accent, cool-slate neutrals) as the direction for this revamp; ADR 0007's structural
decisions (single source of truth for theme tokens, `ThemePreferenceProvider`, the
`maxContentWidth` token) are not being undone by this document — only the palette and the
card-based content treatment are.

### 6. Chart colour rule — the signature move

Chart series use a **monochrome ramp** drawn from the grey palette. The orange accent (`#DA5C2C`)
appears in a chart **only** for the selected series or a series that has breached a ceiling — so
orange means "this needs you." This follows Axiom's own rule that the accent is never decorative,
and deliberately differs from peers (fal.ai renders series in green/teal/purple/yellow/pink; OpenAI
in greens/purples/oranges). Ridgeline plots benefit especially, since they read on shape rather than
hue.

### 7. Dashboards move off Grafana into the app

Three dashboards, chosen by the owner, replace today's Grafana link-out
(`responsive-tab-bar.tsx`'s `isHiddenRoute`/`EXPO_PUBLIC_GRAFANA_URL` gate):

1. Spend/cost by project and model.
2. Per-model latency distribution (histogram/ridgeline).
3. Budget/quota consumption vs ceiling.

All three are backed by the existing usage query API, `POST /usage/v1/usage/query`, which supports
`bucket`, `filters`, and `group_by` over model/project/account/api_key/user dimensions — no backend
change is implied.

Product pattern to carry over from research: OpenAI's usage screen pairs the number with its
ceiling (`"$0.60 of $120.00"`) and places **"Increase limit" directly beside it**. The budget
dashboard here should likewise be where a refill is *requested*, not merely where consumption is
displayed — `useRequestBudgetRefill`/`requestBudgetRefill` already exists
(`budget-refill-screen.tsx`) and should be surfaced from the dashboard, not only from Settings.

### 8. Config-driven logo

A logo URL belongs in admin config and is rendered in the header.

### 9. Charts are built on `react-native-svg` + `d3-scale`/`d3-shape`

`react-graph-gallery` is a **design reference, not a code source** — its examples are D3+DOM and do
not port to React Native. `d3-scale`/`d3-shape` are pure math (no DOM dependency) and work fine
under `react-native-svg`, which is the only viable charting substrate given the app is Expo +
react-native-web with zero charting dependency present today (see Context).

## Applies "from now on"

This direction — shell inversion, breakpoints, nav spine, palette, chart colour rule — applies to
the whole app going forward, not only to newly built screens. Existing screens (Home, Api-Keys,
Settings, Usage placeholder) are migrated as part of the shell rollout (Follow-ups below), not left
on the old pattern indefinitely.

## Consequences

- The current `NavContainer`/`NavItem`/`responsive-tab-bar.tsx` stack is superseded by a new
  three-panel shell primitive in `packages/ui`; the sidebar/bottom-tab placement split it currently
  offers is not sufficient (no floating-panel-over-floor separation, no right-hand config panel, no
  bottom-sheet fallback at the compact tier).
- `designTokens.breakpoint` grows from one value to three, and every screen/component that reads
  `useIsDesktop()` needs re-auditing against the new compact tier — that hook currently only
  answers "desktop or not."
- ADR 0007's palette (`#3E63DD`, light-first) and card-based content areas are superseded by the
  Axiom-derived dark palette and floor-not-card content treatment; ADR 0007's theming plumbing
  (`ThemePreferenceProvider`, the single-source-of-truth requirement between the CSS-variable and
  inline-`colors.*` palettes) stays load-bearing and must be re-pointed at the new palette values
  rather than rebuilt.
- A new runtime dependency set (`react-native-svg`, `d3-scale`, `d3-shape`) is added to
  `apps/self-service` (or a new `packages/charts` — see Follow-ups) — first charting dependency in
  the workspace.
- `usage.tsx`'s Grafana-URL gate (`EXPO_PUBLIC_GRAFANA_URL`) is retired once the in-app dashboards
  ship; this is a hard cutover per house style, not a parallel/optional path.
- Role gating for the `Admin` nav group depends on the client actually knowing the caller's role
  at render time; confirm `packages/hooks/src/rbac.ts`'s role resolution is available outside the
  settings/project-member screens it's used in today (`project-settings-view.tsx`) before wiring
  the nav spine.

## Alternatives considered

- **Keep the sidebar/bottom-tab shell and only reskin colours.** Rejected — the floating-panel
  inversion and the right-hand config panel are structural, not cosmetic; a reskin would leave the
  content-in-a-card / bordered-chrome pattern the owner explicitly wants inverted.
- **A separate admin app.** Rejected outright by the owner: the self-service app *is* the admin;
  role-gating one nav group is the entire admin surface.
- **Vega-Lite / Victory Native / another chart framework.** Not selected — the owner specified
  `react-native-svg` + `d3-scale`/`d3-shape` directly, matching what `react-graph-gallery`'s
  examples conceptually target while staying RN-native (no DOM dependency, unlike the gallery's own
  D3+DOM code).
- **Multi-colour chart series (peer pattern: fal.ai, OpenAI).** Rejected — conflicts with Decision 6
  and with Axiom's "accent is never decorative" rule; monochrome-plus-signal-orange was chosen
  deliberately to differ from both peers.
- **Adopting Hex's serif/violet direction.** Rejected — reads as marketing rather than console, per
  Decision 5.

## Follow-ups

Implementation work implied by this ADR, scoped small enough to land as separate PRs:

1. **Shell + breakpoints** — three-tier breakpoint tokens in `packages/ui/src/design/tokens.ts`;
   new floating-panel shell primitive(s) (left panel, floor container, right panel/bottom-sheet)
   replacing `NavContainer`'s current sidebar/bottom placement split.
2. **Nav spine + role gating** — `Overview / Api-Keys / Manage / Admin` route groups; wire `Admin`
   visibility to the existing `lightbridge-admin` role via `packages/hooks/src/rbac.ts`; retire
   `tab-routes.ts`'s flat four-item list.
3. **Chart primitives** — add `react-native-svg`, `d3-scale`, `d3-shape`; build the monochrome +
   signal-orange chart primitive(s) (line/area, histogram/ridgeline) in `packages/ui`.
4. **Dashboard: spend/cost by project and model.**
5. **Dashboard: per-model latency distribution (histogram/ridgeline).**
6. **Dashboard: budget/quota consumption vs ceiling**, with "request refill" surfaced inline via
   the existing `useRequestBudgetRefill`.
7. **Config-driven logo** — add a logo URL field to admin config; render it in the header shell.
8. **Retire the Grafana usage link-out** — remove `EXPO_PUBLIC_GRAFANA_URL`/`usage` config gate in
   `responsive-tab-bar.tsx` once dashboards (4–6) ship.
9. **Palette + theming re-point** — apply the Axiom-derived dark palette through the existing
   `ThemePreferenceProvider`/CSS-variable + inline-`colors.*` dual-source mechanism from ADR 0007,
   rather than bypassing it.
