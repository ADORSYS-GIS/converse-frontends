---
name: console-ui
description: UI structure contract for the Next.js console and packages/ui-web components. Use whenever building, reviewing, or restyling anything in packages/ui-web or apps/console — shell layout, panels, tables, charts, forms, stat cards, empty/loading/error states. Encodes the ADR 0008/0009 visual direction, the ADR 0010 primitive stack (daisyUI, Base UI, cmdk, Floating UI) and two-theme model, and the docs/design/console-redesign spec.
---

# Console UI structure

You are building the Lightbridge console: an Axiom-derived observability-style surface, **dark by
default (`black`) with a first-class light theme (`wireframe`)** — ADR 0010.
The full contracts live in the repo — **read them before writing components**:

- `docs/design/console-redesign/README.md` — token sheet, shell grid, component inventory with
  per-component contracts, screen specs, interaction contracts. This is the primary spec.
- `docs/adr/0008-console-shell-inversion-and-visual-direction.md` — locked visual direction and
  its status-note amendments.
- `docs/adr/0009-nextjs-console-replacement.md` — platform decisions (DOM, chart ports, refine).
- `docs/adr/0010-ui-primitive-stack-and-theming.md` — the primitive stack (daisyUI · Base UI ·
  cmdk · Floating UI), Tailwind v4, and the two-theme model. Read with
  `docs/design/console-redesign/PRIMITIVES.md`, the per-component migration map.
- The SVG mockups beside the spec (`overview.svg`, `api-keys.svg`, `manage-projects.svg`,
  `admin-budget-review.svg`, `shell-compact.svg`) are the rendered ground truth — match them.

## The one-paragraph mental model

Content is the floor; chrome floats above it. In dark the page is `#000` and floating panels
(`#191919`) carry navigation and parameters; in light the floor is the _grey_ and panels are
_white_. Either way the centre content sits **directly on the floor** — never in a card.
Separation is tonal, never lines, never shadows. Mono type everywhere structural; a single orange
signal that appears only when something is actionable or needs attention. **A scalar gets a
panel, a distribution gets the floor.**

**Rails are for selection-driven content only** (owner review 2026-08-29). Manage and Admin have a
right rail because theirs retargets on the row you pick and carries multi-field forms and decision
actions. **Overview and Api-Keys have no rail at any tier**: their parameters are a handful of
selects with no selection behaviour, and they live in one always-visible horizontal toolbar above
the content (`OverviewToolbar`, `ApiKeysToolbar`) at every breakpoint. Before adding a rail to a
screen, ask whether its content retargets on selection; if it does not, it is a toolbar.

**Scope is identity, not a filter.** The account renders once, in the header, as `AccountBadge` —
a name, or `acct_49534505` when the account has none, never a raw UUID — and that badge is also
the account switcher when more than one account is reachable. The project IS a genuine parameter
and belongs in the screen's toolbar. There is no left-rail `SCOPE` echo and no account id in a
page subline; that arrangement put the same UUID on screen four times.

## Tokens — use the Tailwind semantic tokens, never hex

Single source for the web surface is **`packages/ui-web/src/theme.css`** — the daisyUI
`black`/`wireframe` theme blocks plus our extra token registrations (ADR 0010 Decision 3). It is
the only file in `packages/ui-web` / `apps/console` allowed to contain a colour literal.
(`packages/ui/tailwind-preset.js` is **no longer** ui-web's source — it remains the single source
for the Expo surface, `packages/ui` + `apps/self-service`, which stay on Tailwind v3. Recorded
split: ADR 0010 Decision 3c.)

| Tailwind token | Spec name      | daisy variable            | Dark (`black`) | Light (`wireframe`) | Role                                                                       |
| -------------- | -------------- | ------------------------- | -------------- | ------------------- | -------------------------------------------------------------------------- |
| `muted`        | `--floor`      | `--color-base-100`        | `#000000`      | `#EBEBEB`           | Page background. Never a card fill                                         |
| `chrome`       | `--chrome`     | `--color-neutral`         | `#111111`      | `#F5F5F5`           | Header, form-control inset fill, table row hover                           |
| `surface`      | `--panel`      | `--color-base-200`        | `#191919`      | `#FFFFFF`           | Floating panels, stat cards, bottom sheet                                  |
| `raised`       | `--raised`     | `--color-base-300`        | `#202020`      | `#DEDEDE`           | Active nav row, active segmented cell, table hairlines, skeletons          |
| `border`       | `--line`       | `--color-border`          | `#3a3a3a`      | `#CFCFCF`           | Control borders, chart baseline, group separators                          |
| `subtle`       | `--muted`      | `--color-subtle`          | `#606060`      | `#8A8A8A`           | Labels, placeholders, disabled. Never load-bearing info (~2.9:1 by design) |
| `soft`         | `--body`       | `--color-base-content`    | `#b4b4b4`      | `#4D4D4D`           | Body text, meter fills, rank-1 chart series                                |
| `ink`          | `--strong`     | `--color-ink`             | `#eeeeee`      | `#1A1A1A`           | Headings, key numerals                                                     |
| `primary`      | `--signal`     | `--color-primary`         | `#DA5C2C`      | `#B4441C`           | CTA · active · breach. Never decoration, never a large fill                |
| —              | text on signal | `--color-primary-content` | `#0d0d0d`      | `#FFFFFF`           | Label inside a `primary` fill                                              |

Write `bg-surface text-soft border-border`, not hex. If a needed step is missing, add it to
`theme.css` **in both theme blocks** — never inline a hex value.

**Text on the accent is `primary-content`, not `ink`.** `#eeeeee` on `#DA5C2C` is 3.26:1 (below
AA); `#0d0d0d` is 5.1:1. This corrects the previous "ink = text on the accent" rule (ADR 0010
Decision 3b).

## Primitive stack — what to reach for, in what order

Four libraries, four non-overlapping jobs (ADR 0010 Decision 2). Never solve one need with two.

| Reach for                      | When                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **daisyUI 5 class**            | A visual component class exists: `btn`, `input`, `textarea`, `select`, `table`, `menu`, `tabs`, `toggle`, `checkbox`, `radio`, `skeleton`, `fieldset`/`label`, `join`, `kbd`, `validator`. Add Tailwind utilities for whatever daisy does not cover                                                                                          |
| **Base UI (`@base-ui/react`)** | **Every** control with _behaviour_ — never a native `<select>`, never a hand-rolled popup. As of 2026-08-29 the adoption gap is closed; a new primitive that reimplements Base UI behaviour is a defect. Specifically: Dialog, Alert Dialog, Menu, Select, Combobox, Popover, Tooltip, Tabs, Toggle Group, Field/Fieldset/Form, Switch, Checkbox, Radio, Number Field, Scroll Area, Toast. Style its parts with daisy classes + token utilities via `className` (which also accepts a function of component state) and `data-*` variants |
| **cmdk**                       | The command palette. Nothing else                                                                                                                                                                                                                                                                                                            |
| **Floating UI**                | Positioning anchored to a _point_ rather than an element — chart tooltips over `<svg>`, via a virtual element + `useClientPoint`                                                                                                                                                                                                             |

Drawers and bottom sheets are Base UI's `drawer` — one more primitive on the Base UI row, not a
library of its own. **`vaul` is gone** (owner decision 2026-08-29, superseding ADR 0010 D2, which
named it when Base UI shipped no drawer): it is in no `package.json` and imported nowhere. Do not
reintroduce it, and do not hand-roll a sheet.

**`radix-ui` is not a direct dependency.** It ships transitively under `cmdk` and stays there —
never `import` from `@radix-ui/*` in `ui-web` source, never add it to a `package.json`.
If Base UI genuinely lacks a primitive, use the unified `radix-ui` package for that one primitive
and record why; do not add a fifth library.

**Shrink policy for new and rewritten components:** daisy class → Base UI behaviour → CVA _only_
if a real multi-axis variant set survives. A `cva.ts` whose variants are just `active`/`error`
booleans is deleted in favour of `data-*` variants. Never hand-write a focus trap, a roving
`tabIndex`, or manual `aria-modal`/`aria-activedescendant` wiring — that is what Base UI is for.

The visual contract is **not** relaxed by adopting daisy: both theme blocks pin
`--radius-{selector,field,box}: 0.125rem` (2px), `--depth: 0` and `--noise: 0`, so daisy adds no
shadow, no grain, no pills. See `docs/design/console-redesign/PRIMITIVES.md` § _What is explicitly
not adopted from daisyUI_ before reaching for `badge`, `alert`, `card`, `drawer`, `progress`,
`stats`, `modal`, `glass`, or `table-zebra`.

## Light theme (`wireframe`) rules

- **Default is `black`.** Resolution order: stored preference → `prefers-color-scheme` → `black`.
  `data-theme` on `<html>`; a pre-hydration inline script in the console root layout prevents the
  flash; the toggle lives in `ConsoleHeader`.
- **The inversion holds in both themes.** `base-100`/`base-200` step _away from the floor's
  luminance_ (floor → panel gets lighter in dark, and also lighter in light — the light floor is
  grey, panels are white). `raised` and `border` step toward _greater contrast against the panel
  they mark_: lighter in dark, darker in light.
- **Never `dark:` variants and never `.dark`.** Colour is theme-variable driven; a `dark:` class
  cannot follow `data-theme`. Also never a daisy colour name under `dark:` — daisy's own rule.
- Every component and every page ships a **light story variant** alongside its existing states and
  mobile story, and must be `addon-a11y`-clean in both themes.
- Light tokens are derived by **luminance-contrast parity** with the dark ramp, not picked by eye.
  If you need a new step, compute it to the same ratio its dark counterpart has.

## Type

Two families only: **IBM Plex Mono** for everything structural (nav, labels, headings, table
cells, all numerics, buttons) and **Inter 400** for sentence-prose only. Roles (size/leading):
`page-title` 22 mono ink · `panel-title` 16 mono ink · `metric` 22–26 mono ink · `row` 12 mono ·
`meta` 11 mono · `label` 11 mono **sentence case** subtle · `prose` 10–11 Inter.
**`label` has exactly one definition** — `LABEL_CLASS` in `packages/ui-web/src/lib/type-roles.ts`
(`DASHBOARD_LABEL_CLASS` one step up for centre-column dashboard headings). Import it; never
re-declare `font-mono text-[…] text-subtle` in a component. Sentence case, not uppercase, since
the owner review of 2026-08-29: one all-caps label reads as restraint, twenty on one screen read
as twenty things shouting.
Numerics are right-aligned; thousands use thin space (`$1 131.80`); currency always two decimals.

## Shape and layout

- Radius `2px` everywhere. No pills, no `rounded-full`.
- No `box-shadow` anywhere. No borders on panels — only form controls (`border`), table
  hairlines (`raised`), and the chart baseline get strokes.
- Spacing scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`. Rail panels pad 16, centre panels 20,
  32 only for >600px prose panels.
- **Mobile-first** (ADR 0009 Decision 6): author base styles for phones and scale up with the
  `md:` (600) / `lg:` (1024) breakpoints defined in `theme.css` (`--breakpoint-md`/`-lg` — the
  values are unchanged from the deleted Tailwind v3 configs). Never desktop-first
  overrides.
  - Base (<600, a designed target): single column, 16px gutters, header stays; nav spine docks
    as **bottom navigation**; right-rail content and nav overflow open as **drawers**;
    stat cards stack; ledgers scroll horizontally inside their own `overflow-x-auto` container
    (the page never scrolls sideways); charts full-width.
  - `md` (600–1024): persistent left rail returns. The right rail does NOT dock as a persistent
    footer/peek bar (owner revision 2026-08-25 — no footer bar at this tier): its content is
    reachable through **contextual icon-button triggers placed where they make sense** — a
    filter icon in the toolbar of the table it filters, view/range controls beside the chart
    they configure, the export action near the data it exports. Each trigger opens the relevant
    rail section (not the whole rail) as a **transient bottom sheet** that dismisses on
    action or backdrop. Selection-driven rail content (e.g. Admin's review detail) opens its
    sheet on row selection. The mobile (<600) bottom NAVIGATION bar is unaffected — it is nav,
    not knobs.
  - `lg` (≥1024) full shell at 1440 reference: header h56 `chrome`; left rail x16 w208 (a
    **stack** of panels: nav spine, then scope/sub-nav); centre x248 w872 on the floor; right
    rail x1144 w280, **persistent, never an overlay** — its content retargets on selection.
  - The visual language (floor/panels/tokens/accent rules) is identical at every tier.
- **Rails are flush, aligned, full-height columns — not floating panels** (owner revision
  2026-08-25, supersedes the "floating panel with gutters" reading of ADR 0008 D3): the left and
  right rails sit edge-to-edge against the viewport sides and directly under the header — no
  outer gutters, no gaps between stacked sections, no free-floating panel blocks. Each rail is
  one continuous `surface` column; sections inside it (nav, scope, filters …) separate with
  `raised` hairline rules and their `label` headings, padding 16 — never with margins that let
  the floor show through. Tonal separation, sharp 2px edges, borderless panels, and
  content-on-the-floor all stay; what goes is the floating-with-gaps look.
- **Fluid always**: the shell and every page view are `w-full` — never a fixed pixel width
  (`w-[1440px]` wrappers are banned; 1440 is a reference resolution for mockups, not a CSS
  value). Stories render fluid and follow the iframe width.
- **Flex shell, centre-only stretch, sticky rails** (owner directive 2026-08-25):
  - The shell below the header is a flex row. Rails are fixed-width and `flex-none`
    (`w-[208px]` / `w-[280px]`); the centre is the ONLY stretching zone: `flex-1 min-w-0`
    (`min-w-0` is mandatory — without it wide children blow the layout open).
  - **No overflow, ever**: the page never scrolls horizontally at any tier. Anything intrinsically
    wide (ledger tables, charts) scrolls inside its own `overflow-x-auto` container; charts
    measure their container rather than forcing a width.
  - **Both rails are sticky and independently scrollable**: `sticky top-[56px]
max-h-[calc(100dvh-56px)] overflow-y-auto` — the centre column is the document's scroller;
    rails hold position while the centre scrolls and scroll their own panel stacks when their
    content exceeds the viewport.
- **All drawers and bottom sheets are Base UI's `Drawer`** (`@base-ui/react/drawer`, since
  2026-08-29 — `vaul` is out of the tree) — the console's only drawer primitive, reached through
  `BottomSheet`/`SectionSheet`/`SelectionSheet`. Never hand-roll a sheet; style the drawer's parts
  with the semantic tokens (`surface` panel, `muted/80` backdrop, radius 2, no shadow). Two things
  the swap made non-obvious, both verified in a browser rather than inferred:
  - A **tier class (`lg:hidden`/`md:hidden`) goes on `Drawer.Portal`**, never on the backdrop and
    panel. A modal portal also holds Floating UI's `InternalBackdrop`, an unclassable
    `position: fixed; inset: 0` press-absorber; hide the two visible parts and that layer stays,
    leaving the page dead under a sheet nobody can see. `BottomSheet` exposes this as
    `portalClassName`, and that is the only correct place for it.
  - The CSS layer is a **net, not the gate.** A modal drawer is modal for as long as it is `open`,
    so a sheet left open across a resize past its tier still scroll-locks and `aria-hidden`s the
    page. Suppressing `open` itself (`open && useIsBelowLg()`) is the primary defence and stays.
- **Rail alignment grid** (single source: `packages/ui-web/src/lib/rail-grid.ts` — consume it,
  never hand-roll rail insets): rows bleed 8px (`-mx-2`) with 12px row padding; icon column
  16px + 8px gap; **every rail label — nav item, sub-nav item, uppercase section label — starts
  at the shared 44px label x** (icon-less rows reserve the icon column with a spacer); active
  bars are 2px wide at 8px inset everywhere; row heights 34px nav / 28px sub-nav (deliberate).
- The right rail owns the action that consumes its own parameters (`New key`,
  `Generate report`, review decisions). Row-scoped actions stay in the row.
- Admin nav group: preceded by a `raised` rule + `ROLE` marker; hidden entirely for non-admins.

## Charts

DOM `<svg>` only — no chart framework. Math comes verbatim from
`@lightbridge/ui/src/components/chart-core` (scales, bins, `seriesColor`, ramp constants).
Monochrome ramp by series rank; orange at most once per chart, only for the selected/breached
series. Gridlines `raised`, baseline `border`, tick labels 9px `subtle`. Meters: 4px `raised`
track, `soft` fill, `primary` only past the warning threshold.

The ramp is **theme-dependent** (ADR 0010 Decision 5) — `seriesColor`'s rank/accent _behaviour_ is
unchanged, only which grey a rank resolves to:

| Series rank | Dark      | Light     |
| ----------- | --------- | --------- |
| 1           | `#b4b4b4` | `#363636` |
| 2           | `#7c7c7c` | `#636363` |
| 3           | `#565656` | `#8B8B8B` |
| 4+          | `#3a3a3a` | `#AFAFAF` |

SVG `fill`/`stroke` attributes are the **one sanctioned exception** to "never hex" — and even
there the values come from `chart-tokens.ts` reading the theme variables, never from a literal in
a component.

Chart tooltips are positioned by **Floating UI** (virtual element + `useClientPoint`, with the
chart `<svg>` as `contextElement`), never by hand-computed `left`/`top` arithmetic.

## States

- **Empty**: an inline mono status line above still-rendered structure (headers/axes stay).
  Never a centered placard, never an illustration. **The message must be DOM text, never an SVG
  `<text>`** — SVG text does not wrap, so a message longer than the plot is wide spills off both
  ends at once (the real cause of the owner-reported "clipped at both ends" latency copy,
  2026-08-29). Axis tick labels stay SVG; the message does not.
- **Loading**: skeleton blocks (`raised`) matching final geometry — daisy's `skeleton` class with
  `h-*`/`w-*`, its animation suppressed centrally. No spinners, no shimmer.
- **Error**: a `primary`-coloured mono line in place of the value with an inline `Retry` ghost.
- **Status is text, never a pill**; counts go in tab labels, never badges.
- **Deltas are never green/red** — direction is glyph + wording in greys.

## Component conventions (packages/ui-web)

- Directory per component: `src/components/<kebab-name>/` with `component.tsx`, `cva.ts`
  (**only** when a real multi-axis variant set survives the shrink policy above), `types.ts`,
  `index.ts`, `component.stories.tsx`, and `component.test.tsx` (vitest + testing-library).
  `tailwind-merge` via the package's `cn()` stays for className composition.
- Files kebab-case; components PascalCase; props typed and exported from `types.ts`.
- Every component ships stories covering its real states (default, empty, loading, error,
  breached/selected where applicable) — stories are the acceptance surface and must pass
  `addon-a11y` (contrast findings on `subtle` text are acceptable only for non-load-bearing
  metadata).
- Barrel `src/index.ts` is region-structured (one commented region per component family);
  add exports only inside your region to keep parallel PRs conflict-free.
- No React Native imports of any kind. Client components only where interaction requires it.
- Charts and tables render on the floor: components must not wrap themselves in a panel —
  panelling is the consumer's decision (`RailPanel`, `StatCard` are the only self-panelled ones).

## Composition — sections in the library, the shell mounted once, pages only in stories

**The library exports sections, never full pages** (owner correction 2026-08-25 — monolithic
`*Page` exports caused every route to remount its own shell, the "rebuilt on every navigation"
anti-pattern):

- `packages/ui-web/src/sections/<kebab-name>/` holds **screen sections** — the zone-level
  compositions a route assembles: stat rows, dashboards (spend/latency/budget), ledger zones
  (keys, projects, review queue, decisions), rail sections (scope, filters, view, export,
  review detail), toolbars with their sheet triggers. Sections are presentational only: **data
  via typed props, no fetching, no refine hooks, no routing**; callbacks are props. Each ships
  `fixtures.ts`, stories, and tests. Barrel region: `// ── sections`.
- **The shell mounts exactly once, in `apps/console`'s persistent layout** — ConsoleShell +
  ConsoleHeader + NavSpine live in a route-group `layout.tsx`, with the per-route right-rail
  content supplied through an App Router **parallel-route slot** (`@rail`) and the centre
  through `children`. Route pages compose sections; they never render the shell. Navigating
  must not remount the header/nav (this is testable: the nav DOM node persists across route
  changes).
- **Full-page compositions exist in exactly two places**: (1) Storybook — page-level stories
  under `src/pages-stories/` (or equivalent) that compose sections inside the shell with mock
  fixtures; these remain the e2e acceptance surface (populated/empty/loading/error/role/mobile
  variants, 1:1 vs the SVG mockups, ~390px mobile story) for checking a feature per page
  without starting the app; and (2) `apps/console`'s route implementations. There is **no
  `*Page` component in the package barrel**.
- **One style pipeline**: `apps/console`'s `globals.css` imports the package's stylesheet
  (`@lightbridge/ui-web/styles.css` — and after ADR 0010 Phase 1, its `theme.css`); the app
  never re-declares fonts/tokens or runs a duplicate base layer.

## Refine-driven mock screens

Beside the fixture-driven page stories, `src/refine-mock/` hosts a Storybook-only harness:
`@refinedev/core`'s `<Refine>` with a **mock data provider** over the section fixtures (simulated
latency, optional error mode), plus thin container components that drive the pure sections
from refine hooks (`useTable`/`useList`/`useForm`/`useOne`) exactly the way `apps/console` will.
Stories under the `Refine` title group (`Refine/Manage`, `Refine/ApiKeys`, …) demonstrate live
list→selection→edit/decide flows. Rules: the sections stay pure (containers adapt hook state
to props); the mock provider is never exported from the package barrel; deps on `@refinedev/*`
are devDependencies only.

## State — URL-first via nuqs (ADR 0011)

- In `apps/console`, **view state lives in the URL** through nuqs (`useQueryState`/
  `useQueryStates`, typed parsers, defaults kept out of the URL): scope, filters,
  range/bucket/group-by, selections, active tabs, open section sheets. The URL is the state bus
  between the centre and the rail slots — no view-state providers/contexts.
- **`useState` in view code is a defect unless it is one of the sanctioned exceptions**:
  hover/tooltip tracking, focus management, pre-submit form drafts that must not enter URL or
  history (typed-confirm text, decision notes), animation/measurement state. Every surviving
  local-state site carries a one-line justification comment.
- `packages/ui-web` never imports nuqs — components stay controlled (props + callbacks) so the
  app owns their state; uncontrolled conveniences must always offer the controlled form.
- One URL writer: refine's `syncWithLocation` stays off; selection/filter params feed refine
  hooks, not the other way round. Use `history: 'replace'` for knob twiddling; throttle
  high-frequency params.

## Never do

Card-wrapped centre content · borders or shadows on panels · a second accent colour · orange as
decoration or large fill · green/red deltas · pills/badges · rounded-full · spinners ·
centered empty-state placards · empty-state copy inside an SVG `<text>` · uppercase labels ·
a native `<select>` (use `SelectField`) · a floating overlay without `OVERLAY_CLASS` ·
a hand-drawn chevron (use `Chevron`) ·
re-declaring the `label` type role instead of importing `LABEL_CLASS` · a raw account UUID as a
visible label · a right rail on a screen whose rail content is not selection-driven · pie/donut
charts (use `ShareBar`) · hex colours in components · React Native imports · a chart
framework dependency · `dark:` variants or a `.dark` class · `tailwind.config.js` in `ui-web` or
`apps/console` (Tailwind v4 is CSS-first) · importing `@radix-ui/*` directly · hand-written focus
traps or roving `tabIndex` · a `cva.ts` that only encodes boolean state.
