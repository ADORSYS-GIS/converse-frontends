# ADR 0008: Console shell inversion, breakpoints, nav spine, and visual direction

## Status

Accepted — **Decision 3 (shell inversion, the persistent right-rail contract) and the
monospace-primary half of Decision 5 superseded by
[ADR 0012](0012-console-visual-revamp.md)** (owner directive 2026-08-30). The three-rail,
header-band shell is replaced by a two-column shell (240px sidebar + fluid content column); the
centre is no longer "never a card" — cards are now the default zone container; radius moves from
2px to 8px (panels) / 4px (controls); and structural type is sans-first, with mono reserved for
data values only. Everything else this ADR locked — the near-black tonal palette, the single
`#DA5C2C` signal accent used only for CTA/active/breach, the monochrome chart-series ramp, "status
as text, never a pill" — is unchanged and still binding; ADR 0012 records exactly which clauses it
replaces and which it leaves standing.

Accepted — **Decisions 1–2 and 9 superseded by
[ADR 0009](0009-nextjs-console-replacement.md)** for the Next.js console. Decisions 1–2 (no
mobile target, landscape forced, ≤600 as an unstyled guard rail) were bound to the Expo app; the
Next.js console is **mobile-first** (ADR 0009 Decision 6) with `<600` a designed target — the
breakpoint values themselves survive. Decision 9's substrate change: the chart
substrate becomes DOM `<svg>` ports of the same d3 `chart-core` primitives (`react-native-svg`
was only ever an Expo constraint). Everything else in this ADR — shell inversion, breakpoints,
nav spine, palette, chart-colour rule — carries over to the Next.js console unchanged.

Boundary clarifications adopted with the Next.js design spec
([docs/design/console-redesign](../design/console-redesign/README.md), §10):

- **A scalar gets a panel, a distribution gets the floor** — stat cards render on `#191919`;
  charts, meters, and tables sit uncontained on `#000` (resolves the D3-vs-D5 boundary).
- **The right panel owns the action that consumes its own parameters** (e.g. `New key`,
  `Generate report`, review decisions); actions operating on a centre row stay in the row — an
  extension of D3's "params/filters/knobs".
- ADR 0007's `maxContentWidth` token is retired for console routes (the centre is bounded by the
  rails); it survives only as the Auth page's column cap.
- Auth (login / signed-out) renders **outside the shell** — on the floor, no rails, no nav-spine
  group.
- **Rail treatment revised (owner, 2026-08-25, after reviewing rendered pages)**: rails are
  flush, aligned, full-height columns — edge-to-edge against the viewport and the header, with
  sections separated by `raised` hairline rules inside one continuous surface. The
  floating-with-outer-gutters panel look this ADR's Decision 3 sketched read as misaligned once
  real screens existed; the _inversion itself_ (tonal chrome above a content floor, no borders,
  content never carded) is unchanged. The `docs/design/console-redesign` SVG mockups still show
  the floating treatment and are superseded on that one point.
- **LATENCY is contractually blocked, not merely unwired (owner decision, Epic 4 Story 4.2 / #307,
  2026-08-28).** Decision 7 below lists "per-model latency distribution" as one of the three
  dashboards, on the stated assumption that all three are "backed by the existing usage query API"
  — that assumption does not hold. `openapi/usage.backend.yaml`'s `UsageQueryResponse.
UsageSeriesPoint` carries exactly `requests`, `usage_value`, `total_cost`, `prompt_tokens`,
  `completion_tokens` and `total_tokens` — no latency or percentile field, and never has. SPEND and
  BUDGET are unaffected (they only ever needed `total_cost`, which the contract does provide) and
  are wired for real as of #304-#306. **Decision: keep the LATENCY section, rendered in its
  existing `status="unwired"` state** (reusing the vocabulary `SpendDashboard`/`BudgetHero` used
  before their own data existed, per console-ui's "reuse the vocabulary" rule — not a new "blocked"
  status), with its message overridden to name the real, permanent reason instead of the generic
  "never queried" wording. Removing the section outright was rejected: the design intent (Decision 7) is still correct, only the backend support is missing, and an explicit, honestly-worded gap is
  more useful to an operator than a vanished section they'd have to rediscover was ever planned.
  Unblocking this is Epic 6's "Usage API — expose latency/percentile fields" item (tracked as
  `#294`) — a cross-team backend change, out of scope for the console. Re-evaluate this note the
  moment that field lands on the contract; until then, no console code should attempt to derive a
  latency figure from `usage_value` or any other existing field — that would be exactly the
  fabrication this epic exists to prevent.

  **Status update — the contract landed; LATENCY is wired, honest PER SERIES rather than
  all-or-nothing.** The `lightbridge-authz` backend contract change described above shipped
  (`feat/usage-latency-percentiles`): `openapi/usage.backend.yaml`'s `UsageSeriesPoint` gained
  `latency_samples` (always present), and `latency_p50_ms`/`latency_p95_ms`/`latency_p99_ms`
  (nullable, present exactly when `latency_samples > 0`). `LatencyDashboard` no longer renders
  `status="unwired"` by default — it is wired off the SAME `queryUsage` call SPEND already runs
  (`apps/console/src/containers/use-overview-screen.ts`), through `toLatencySeries`
  (`overview-usage.ts`), the same way `toSpendSeries` always was.
  The standing rule this status note existed to state survives the contract landing, and is now
  enforced at a finer grain than "the whole section": a group whose buckets all report
  `latency_samples === 0` (an aggregate metric signal — an OTLP histogram/summary/exponential-
  histogram data point genuinely carries no per-request duration, per `latency_samples`'s own
  schema doc comment) still gets a row in the ridgeline, but with `values: []` and a footnote
  (`latencyFootnote`) naming exactly which group(s) — or, if every group reported nothing this
  range, the range/filter itself — rather than either fabricating a shape for it or reverting to a
  chart-wide `'unwired'`/blocked claim. **The rule that does not change:** no console code may
  derive a latency figure from `usage_value` or any other non-latency field, and no console code
  may synthesise raw per-request samples from a percentile (`LatencyRidgelineSeries.values` is
  always real, kept per-bucket `latency_p95_ms` observations, never interpolated or repeated to
  fake a density) — both would be exactly the fabrication this epic always existed to prevent.

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

Primary reference: **Axiom** ([axiom.co](https://axiom.co), dark observability console). Preserve:

- Near-black canvas with tonal surface layers: `#000` floor → `#111` header/nav → `#191919`
  floating panels.
- Monospace-primary type for all numerics.
- A single accent, `#DA5C2C`, used for **CTA and active states only — never decoration**.
- 2px radius, near-zero shadow, generous card padding.

Borrow **only** from **Midday** ([midday.ai](https://midday.ai), "achromatic ledger"): the table treatment — hairline
borders, 0px radius, no shadow, elevation via typographic hierarchy — applied to dense money/data
tables only, not the rest of the shell.

Rejected: **Hex**'s ([hex.tech](https://hex.tech)) serif display + violet accents (softens a
console into marketing); any second vibrant colour; rainbow chart series.

Refero references used:

- Style: [Axiom Refero preview](https://images.refero.design/styles/axiom.co/6e9baa82-2f2f-4e77-8b0d-566325635dbe/preview_0.jpg),
  with [source site](https://axiom.co), for the near-black tonal layering, sparing single-orange
  accent, monospace-leaning technical type, and minimal-rounding panels this decision locks to.
- Style: [Midday Refero preview](https://images.refero.design/styles/midday.ai/7eb5e800-dff7-473b-84c2-71a98ebac23c/preview_0.jpg),
  with [source site](https://midday.ai), for the ledger-like table treatment: squared-off panels
  outlined by hairline borders instead of shadows, hierarchy carried by typography and spacing.
  **Note the deliberate mismatch:** Midday's own canvas is bright white and light-first. Only its
  _table structure_ is borrowed here, never its tone — which is exactly why this decision scopes
  the borrow to dense money/data tables rather than the shell.
- Style: [Hex Refero preview](https://images.refero.design/styles/hex.tech/6c402a97-7748-469e-a90a-fe68810d7ba1/preview_0.jpg),
  with [source site](https://hex.tech), recorded as the **rejected** direction: the oversized
  editorial serif headline and Minsk-violet accents that read as marketing rather than console.

The style links point to Refero-hosted previews because Refero style search exposes preview images
and source URLs, not a human-facing style detail page — the same convention ADR 0001 uses.

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

Sourcing note: the fal.ai and OpenAI series-colour observations were made by looking at those
products' own usage surfaces directly. Refero has no captured screen for either
(searched 2026-08-23), so unlike Decision 5 there is no Refero link to re-open — treat them as a
point-in-time observation that may drift as those products change.

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
dashboard here should likewise be where a refill is _requested_, not merely where consumption is
displayed — `useRequestBudgetRefill`/`requestBudgetRefill` already exists
(`budget-refill-screen.tsx`) and should be surfaced from the dashboard, not only from Settings.

The OpenAI screen itself is a direct observation with no Refero capture behind it (see Decision 6's
sourcing note). Refero references used for the same pattern, which _are_ re-openable:

- Screen: [Cohere spending limit](https://refero.design/pages/0316cb1c-3c50-4af2-8ca1-fd84b004d901) —
  a monthly cap shown with usage progress against it and the edit/remove controls placed on the
  same panel, which is the "number beside its ceiling beside its control" structure this decision
  adopts.
- Flow: [Cohere setting a monthly spending limit](https://refero.design/flows/3896) — the same
  pattern as a journey rather than a single screen, useful for where the refill request is entered
  from. ADR 0001 already draws on Cohere for API-key building blocks, so this is a consistent
  reference rather than a new one.

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
- **A separate admin app.** Rejected outright by the owner: the self-service app _is_ the admin;
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
