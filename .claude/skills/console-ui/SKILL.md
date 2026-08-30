---
name: console-ui
description: UI structure contract for the Next.js console and packages/ui-web components. Use whenever building, reviewing, or restyling anything in packages/ui-web or apps/console — shell layout, cards, tables, charts, forms, stat cards, empty/loading/error states. Encodes the ADR 0008/0009/0012 visual direction, the ADR 0010 primitive stack (daisyUI, Base UI, cmdk, Floating UI) and two-theme model, and the docs/design/console-redesign spec.
---

# Console UI structure

You are building the Lightbridge console: an Axiom-derived observability-style surface, **dark by
default (`black`) with a first-class light theme (`wireframe`)** — ADR 0010, over a two-column
shell — ADR 0012 (2026-08-30 owner directive: "The full UI is shit... Revamp it... keep base-ui
AND daisyui as base tho").
The full contracts live in the repo — **read them before writing components**:

- `docs/design/console-redesign/README.md` — token sheet, shell grid, component inventory with
  per-component contracts, screen specs, interaction contracts. This is the primary spec.
- `docs/adr/0012-console-visual-revamp.md` — the current shell/type/card decisions and their
  reference lock (Anthropic Console, fal.ai, Cartesia, Attio). **Read this one first** — it
  supersedes the shell-shape and type-hierarchy parts of the two ADRs below.
- `docs/adr/0008-console-shell-inversion-and-visual-direction.md` — palette, chart-colour rule,
  status-as-text; its shell-inversion and mono-primary clauses carry a status-note amendment
  pointing at ADR 0012.
- `docs/adr/0009-nextjs-console-replacement.md` — platform decisions (DOM, chart ports, refine).
- `docs/adr/0010-ui-primitive-stack-and-theming.md` — the primitive stack (daisyUI · Base UI ·
  cmdk · Floating UI), Tailwind v4, and the two-theme model. Read with
  `docs/design/console-redesign/PRIMITIVES.md`, the per-component migration map.
- The page stories in `packages/ui-web/src/pages-stories/` (`overview`, `api-keys`, `projects`,
  `admin-budget-review`, `settings`, `shell-persistence`) are the rendered ground truth — match
  them. There are no SVG mockups any more; a stale mockup was judged worse than none and deleted.

## The one-paragraph mental model

Cards sit on a floor, inside a shell with a persistent LEFT sidebar, a stretching centre column,
and a SITUATIONAL right inspector rail. In dark the floor is `#000` and cards (`base-200`) carry
stats, charts, tables and forms; in light the floor is grey and cards are white. The sidebar
(240px, `md`+) carries navigation, a workspace switcher and a footer stack; below `md` a 48px top
bar plus a bottom nav dock replace it. **The right rail returned** (owner, 2026-08-30, superseding
ADR 0012 D1/D7's "no right rail at any tier"/"`DetailSheet` is the one surface for row detail"):
at `lg`+ (1024px) it shows a selection's detail (`/projects`, `/admin`) or the account
quick-settings panel (`/`, standing) — resizable by drag (`RailResizer`, 240–480px, default 280,
persisted per viewer) — and is ABSENT entirely, not an empty placeholder, on any route/state with
nothing to put in it (owner: "the right rail was empty depending on the situation. Solution: hide
it if empty"). Below `lg`, the same selection-driven content opens as a `BottomSheet` docked to
the BOTTOM of the viewport, never from a side (owner's locked layout contract: "Right rail on
large screens, bottom sheet on medium and small. Not from sides."); `DetailSheet` — the old
fixed-420px, right-docked surface — is deleted. Every screen opens with `PageHeader` (title,
subtitle, inline controls, one action), then a stack of `Card`s — one per self-contained zone.
Sans type (Inter) is the default everywhere structural; mono (IBM Plex Mono) is reserved for data
values — currency, counts, ids, timestamps — never for prose or chrome. A single orange signal
appears only when something is actionable or needs attention.

**This reverses two ADR 0008 rules on purpose** (ADR 0012): "centre is never a card" is dead —
cards are now the default zone container — and "monospace-primary for everything structural" is
narrowed to "mono is data only." Everything else ADR 0008 locked (palette, one signal accent,
chart-colour rule, status-as-text) is unchanged.

## Tokens — use the Tailwind semantic tokens, never hex

Single source for the web surface is **`packages/ui-web/src/theme.css`** — the daisyUI
`black`/`wireframe` theme blocks plus our extra token registrations (ADR 0010 Decision 3). It is
the only file in `packages/ui-web` / `apps/console` allowed to contain a colour literal.
(`packages/ui/tailwind-preset.js` is **no longer** ui-web's source — it remains the single source
for the Expo surface, `packages/ui` + `apps/self-service`, which stay on Tailwind v3.)

| Tailwind token | Spec name      | daisy variable            | Dark (`black`) | Light (`wireframe`) | Role                                                                       |
| -------------- | -------------- | ------------------------- | -------------- | -------------------- | --------------------------------------------------------------------------------- |
| `muted`        | `--floor`      | `--color-base-100`        | `#000000`      | `#EBEBEB`           | Page background. `Card` sits on it, is never confused with it              |
| `chrome`       | `--chrome`     | `--color-neutral`         | `#111111`      | `#F5F5F5`           | Sidebar/top-bar fill, form-control inset fill, table row hover                     |
| `surface`      | `--panel`      | `--color-base-200`        | `#191919`      | `#FFFFFF`           | `Card`, `BottomSheet`, the inspector rail, dialogs, `StatCard`                                        |
| `raised`       | `--raised`     | `--color-base-300`        | `#202020`      | `#DEDEDE`           | Active nav row, active segmented cell, table hairlines, skeletons                  |
| `border`       | `--line`       | `--color-border`          | `#3a3a3a`      | `#CFCFCF`           | Control borders, `Card`'s own hairline, chart baseline, group separators           |
| `subtle`       | `--muted`      | `--color-subtle`          | `#606060`      | `#8A8A8A`           | Labels, placeholders, disabled. Never load-bearing info (~2.9:1 by design) |
| `soft`         | `--body`       | `--color-base-content`    | `#b4b4b4`      | `#4D4D4D`           | Body text, meter fills, rank-1 chart series                                        |
| `ink`          | `--strong`     | `--color-ink`             | `#eeeeee`      | `#1A1A1A`           | Headings, key numerals                                                            |
| `primary`      | `--signal`     | `--color-primary`         | `#DA5C2C`      | `#B4441C`           | CTA · active · breach. Never decoration, never a large fill                       |
| —              | text on signal | `--color-primary-content` | `#0d0d0d`      | `#FFFFFF`           | Label inside a `primary` fill                                                     |

Write `bg-surface text-soft border-border`, not hex. If a needed step is missing, add it to
`theme.css` **in both theme blocks** — never inline a hex value.

**Text on the accent is `primary-content`, not `ink`.** `#eeeeee` on `#DA5C2C` is 3.26:1 (below
AA); `#0d0d0d` is 5.1:1.

## Primitive stack — what to reach for, in what order

Four libraries, four non-overlapping jobs (ADR 0010 Decision 2). Never solve one need with two.

| Reach for                      | When                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **daisyUI 5 class**            | A visual component class exists: `btn`, `input`, `textarea`, `select`, `table`, `menu`, `tabs`, `toggle`, `checkbox`, `radio`, `skeleton`, `fieldset`/`label`, `join`, `kbd`, `validator`. Add Tailwind utilities for whatever daisy does not cover                                                                                          |
| **Base UI (`@base-ui/react`)** | **Every** control with _behaviour_ — never a native `<select>`, never a hand-rolled popup. As of 2026-08-29 the adoption gap is closed to one deliberate refusal (`row-action-group` — see `base-ui-adoption.test.ts`'s `KNOWN_GAPS`, which may only shrink); a new primitive that reimplements Base UI behaviour is a defect. Specifically: Dialog, Alert Dialog, Menu, Select, Combobox, Popover, Tooltip, Navigation Menu, Toggle Group, Field/Fieldset/Form, Switch, Checkbox, Radio, Number Field, Scroll Area, Toast, Drawer, Meter. Style its parts with daisy classes + token utilities via `className` (which also accepts a function of component state) and `data-*` variants |
| **cmdk**                       | The command palette. Nothing else                                                                                                                                                                                                                                                                                                            |
| **Floating UI**                | Positioning anchored to a _point_ rather than an element — chart tooltips over `<svg>`, via a virtual element + `useClientPoint`                                                                                                                                                                                                             |

Drawers and bottom sheets are Base UI's `drawer` — one more primitive on the Base UI row, not a
library of its own. **`vaul` is gone** (owner decision 2026-08-29): it is in no `package.json` and
imported nowhere in the console path. Do not reintroduce it, and do not hand-roll a sheet.

`BottomSheet` (row detail — project detail, refill review, below `lg` only) is Base UI's
**Drawer**, bottom-only (`swipeDirection="down"` always — the side-docked variant is deleted, per
the owner's locked layout contract: "Not from sides"). `DetailSheet`, the fixed-420px right-panel
`Dialog` this replaced, is gone; at `lg`+ the inspector rail is the detail surface instead, not a
dialog of any shape.

**`radix-ui` is not a direct dependency.** It ships transitively under `cmdk` and stays there —
never `import` from `@radix-ui/*` in `ui-web` source, never add it to a `package.json`.
If Base UI genuinely lacks a primitive, use the unified `radix-ui` package for that one primitive
and record why; do not add a fifth library.

**Shrink policy for new and rewritten components:** daisy class → Base UI behaviour → CVA _only_
if a real multi-axis variant set survives. A `cva.ts` whose variants are just `active`/`error`
booleans is deleted in favour of `data-*` variants. Never hand-write a focus trap, a roving
`tabIndex`, or manual `aria-modal`/`aria-activedescendant` wiring — that is what Base UI is for.
The `class-budget.test.ts` ratchet enforces the daisy/Base-UI-first half of this mechanically: at
last measurement, 50 components hand-write 33 utilities total, none over the default budget of 3.

The visual contract is **not** relaxed by adopting daisy: both theme blocks pin
`--radius-box: 0.5rem` (8px, panels/cards) / `--radius-selector`/`-field: 0.25rem` (4px, controls),
`--depth: 0` and `--noise: 0`, so daisy adds no shadow, no grain, no pills. See
`docs/design/console-redesign/PRIMITIVES.md` § _What is explicitly not adopted from daisyUI_
before reaching for `badge`, `alert`, `drawer`, `progress`, `stats`, `modal`, `glass`, or
`table-zebra` — note that `card` moved OFF that list in the 2026-08-30 revamp (see next section).

## Light theme (`wireframe`) rules

- **Default is `black`.** Resolution order: stored preference → `prefers-color-scheme` → `black`.
  `data-theme` on `<html>`; a pre-hydration inline script in the console root layout prevents the
  flash; the toggle lives in `ConsoleSidebar`'s footer stack (`ConsoleTopBar`'s compact equivalent
  below `md`).
- **The inversion holds in both themes.** `base-100`/`base-200` step _away from the floor's
  luminance_ (floor → panel/card gets lighter in dark, and also lighter in light — the light floor
  is grey, cards are white). `raised` and `border` step toward _greater contrast against the panel
  they mark_: lighter in dark, darker in light.
- **Never `dark:` variants and never `.dark`.** Colour is theme-variable driven; a `dark:` class
  cannot follow `data-theme`. Also never a daisy colour name under `dark:` — daisy's own rule.
- Every component and every page ships a **light story variant** alongside its existing states and
  mobile story, and must be `addon-a11y`-clean in both themes.
- Light tokens are derived by **luminance-contrast parity** with the dark ramp, not picked by eye.
  If you need a new step, compute it to the same ratio its dark counterpart has.

## Type — sans-first; mono is data only

**ADR 0012 D2** (supersedes ADR 0008 D5's "monospace-primary for all numerics" as a structural
rule). `Inter` (`font-sans`) is the default family for every structural and prose role: page
titles, subtitles, section titles, labels, body copy, meta lines, error text. `IBM Plex Mono`
(`font-mono`) is reserved for **data alone** — currency, counts, percentages, ids/UUIDs, key
prefixes, ISO dates/timestamps, `kbd` — never for prose or structural chrome. Every data role
carries `data-numeral` (tabular figures, right-aligned in ledgers).

One definition per role, `packages/ui-web/src/lib/type-roles.ts` — import the constant, never
re-declare the class string:

| Constant | Size / weight | Family | Used for |
| --- | --- | --- | --- |
| `PAGE_TITLE_CLASS` | 24px / semibold | sans | `PageHeader`'s `title`, one per screen |
| `PAGE_SUBTITLE_CLASS` | 13px | sans | The scope/context line under a page title |
| `SECTION_TITLE_CLASS` | 15px / medium | sans | `Card`'s own title, a dashboard zone heading |
| `LABEL_CLASS` | 12px | sans | Field labels, table column headers, section labels |
| `BODY_CLASS` | 13px | sans | Sentence-copy prose |
| `META_CLASS` | 12px | sans | Captions, non-load-bearing metadata |
| `ERROR_TEXT_CLASS` | 13px | sans | `ErrorLine`'s own text |
| `DATA_CLASS` / `DATA_INK_CLASS` | 13px | mono, `data-numeral` | Table cells: counts, ids, dates, currency |
| `METRIC_CLASS` | 28px | mono, `data-numeral` | Stat-card values, table footers |
| `HERO_METRIC_CLASS` | 34px | mono, `data-numeral` | The one number a screen is about |
| `HERO_CEILING_CLASS` | 13px | sans | The reference value beside a hero metric ("of $2,000.00") |

Sentence case everywhere — no all-caps labels anywhere in the console.
Numeric columns are right-aligned; thousands use thin space (`$1 131.80`); currency always two
decimals.

## Shape and layout

- **Radius** — `--radius-box: 0.5rem` (8px) for `Card`/panels/dialogs; `--radius-selector`/
  `-field: 0.25rem` (4px) for controls (ADR 0012 D4, supersedes the flush 2px pin). No pills, no
  `rounded-full`.
- No `box-shadow` anywhere. `Card` gets a 1px `border` hairline — its one departure from the
  "no borders on panels" rule, since a card needs a visible edge against the floor it sits on;
  table hairlines and the chart baseline get their own strokes as before.
- Spacing scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`. `Card` insets 1.25rem (20px).
- **Mobile-first** (ADR 0009 Decision 6): author base styles for phones and scale up with the
  `md:` (600) / `lg:` (1024) breakpoints defined in `theme.css` (`--breakpoint-md`/`-lg`). Never
  desktop-first overrides.
- **Left sidebar + centre + situational right inspector rail** (owner's locked layout contract,
  restated 2026-08-30: "3 slices: left rail, main content, right rail... Right rail on large
  screens, bottom sheet on medium and small" — supersedes ADR 0012 D1's "no right rail at any
  tier", which itself superseded ADR 0008 D3's three-column inversion):
  - `≥md` (600px+): a persistent 240px `ConsoleSidebar` (brand, workspace switcher, `NavSpine`,
    footer stack: `⌘K` · theme · offline · identity), sticky and independently scrollable, beside
    a single fluid content column capped at `max-w-[1120px]` (`CONTENT_MAX_WIDTH_CLASS`,
    `lib/shell-grid.ts`).
  - `<md`: the sidebar is replaced by a 48px `ConsoleTopBar` (brand, compact switcher, `⌘K`
    trigger, identity) plus the existing bottom navigation dock. `ConsoleSidebar` itself renders
    both the persistent `sidebar` layout and the `bottom-bar` dock from one `groups` prop, so a
    screen never mounts navigation twice — don't build a second nav surface per tier.
  - `≥lg` (1024px) only: the right inspector rail (`ConsoleShell.rail`, resolved by
    `apps/console/src/containers/inspector-rail.tsx`) — `chrome` fill, a `raised` hairline facing
    the centre, drag-resizable (`RailResizer`, `INSPECTOR_RAIL_MIN_WIDTH`–`INSPECTOR_RAIL_MAX_WIDTH`
    px, default `INSPECTOR_RAIL_DEFAULT_WIDTH`, `lib/shell-grid.ts`; width persisted per viewer in
    `localStorage` by `apps/console`'s `use-rail-width.ts`, never in the URL — ADR 0011 Decision 6's
    "a shared URL must not restyle the app for its recipient" reasoning applies to layout
    preferences too). **Situational, never a placeholder** (owner: "the right rail was empty
    depending on the situation. Solution: hide it if empty"): `ConsoleShell` renders the whole rail
    column ONLY when there is real content for it — a selected row's detail on `/projects`/
    `/admin`, or the account quick-settings panel standing on `/` — and collapses it entirely
    otherwise (`/api-keys`, `/settings/*`, or `/projects`/`/admin` with nothing selected). The
    centre column absorbs the freed width either way (`min-w-0 flex-1`).
  - **The content column is the only stretching zone** (`SHELL_CENTRE_CLASS`'s `min-w-0 flex-1`
    — `min-w-0` is mandatory, without it a wide table/chart blows the row open into page-level
    horizontal scroll). Anything intrinsically wide scrolls inside its own `overflow-x-auto`
    container instead.
  - Screen PARAMETERS (range/bucket/group-by, filters, search) stay inline in `PageHeader.controls`
    at every tier — the rail is for SELECTION-driven detail and standing account settings, never
    for knobs. Below `lg`, where the rail is absent, that same selection-driven detail opens as a
    `BottomSheet` instead (bottom-docked, never from a side — see "Primitive stack" above).
- **`Card` is the default zone container** (ADR 0012 D3, kills ADR 0008's "centre is never a
  card"/"a scalar gets a panel, a distribution gets the floor" boundary): stat rows, charts,
  ledgers (toolbar + table + pager inside **one** `Card`), settings sections and forms all wrap in
  `Card`. `PageHeader` and a bare `InlineStatus`/`ErrorLine` are the only things that sit directly
  on the floor. `StatCard`/`BudgetHero` stay self-panelled (their own `surface` fill) even when a
  `Card` also wraps the row they sit in.
- **Nav groups are role-gated by inclusion, not by a marker prop**
  (`apps/console/src/client/console-chrome.tsx`'s `navGroups`): `Workspace` (Overview, Projects,
  API keys), `Account` (Settings), and `Operator` (Refill requests) included in the array only for
  `session.isAdmin`. There is no `adminItems`/`showAdmin`/`roleLabel` axis — a gated group's own
  label row IS the role marker. Never resurrect a `ROLE` badge/marker component.
- **Fluid always**: the shell and every page view are `w-full` — never a fixed pixel width
  (`w-[1440px]` wrappers are banned). Stories render fluid and follow the iframe width.
- **Row detail is the inspector rail at `lg`+, a `BottomSheet` below it — never a side sheet at
  any tier.** `DetailSheet` (a fixed-420px right-docked `Dialog`) is deleted. Below `lg`,
  `BottomSheet` (Base UI `Drawer`, bottom-only) opens on selection: grab handle, header
  (title/subtitle/optional `headerAction`, e.g. `Rename` — never a stranded footer button for a
  header-scale action) · body, content-sized up to `max-height: 85dvh` (never a fixed minimum —
  a short sheet must not leave an empty void below its own content) · optional `footer` for
  content that genuinely belongs at the sheet's foot (a decision panel's own Approve/Decline).
  `portalClassName="lg:hidden"` is how a route keeps its sheet out of the DOM's interactive
  surface at `lg`+, where the rail is the surface instead — never a wrapper class, since the
  Drawer's portal (and Floating UI's own press-absorbing backdrop layer) render outside the
  caller's own subtree.
- **Report export and other "form that used to be a rail panel" surfaces are a `Dialog`**, not a
  sheet or the rail: `ReportExportDialog`, reachable from Overview and Projects.
- **`lib/rail-grid.ts`** backs `NavSpine`/`SubNav`'s own internal row geometry (icon column, label
  x, active-bar inset) — a nav-row alignment grid, unrelated to `lib/shell-grid.ts`'s inspector
  rail column geometry (`INSPECTOR_RAIL_CLASS`/`-MIN_WIDTH`/`-MAX_WIDTH`/`-DEFAULT_WIDTH`) despite
  the name overlap; consume each for what it actually owns.

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

## States — `EmptyState` for first-run, `InlineStatus` for filtered/unavailable

**ADR 0012 D6** — two components, two jobs, never interchanged:

- **`EmptyState`** — first-run emptiness only (no API keys yet in this project, no projects yet in
  this account): a centred column inside a `Card` (headline, explainer, CTA, usually the screen's
  own `+ New …` action reused verbatim). Gate strictly on a *settled* query returning zero rows —
  never while loading (that's `SkeletonRow`/`SkeletonMetric`) or errored (that's `ErrorLine`).
- **`InlineStatus`** — a filtered-to-nothing result (pair with a `Reset filters` ghost button) or
  an unavailable/not-yet-queried state. One line above **still-rendered structure** — table
  headers and chart axes stay visible; a disappearing frame reads as broken, an empty frame reads
  as an empty dataset. **The message must be DOM text, never an SVG `<text>`** — SVG text does not
  wrap, so a message longer than the plot is wide spills off both ends at once.
- **Loading**: skeleton blocks (`raised`) matching final geometry — daisy's `skeleton` class with
  `h-*`/`w-*`, its animation suppressed centrally. No spinners, no shimmer.
- **Error**: a `primary`-coloured mono line in place of the value with an inline `Retry` ghost.
- **Status is text, never a pill**; counts go in tab labels, never badges.
- **Deltas are never green/red** — direction is glyph + wording in greys.
- **Never fabricate or permanently-null a figure** (ADR 0012 D8): an em dash while a query is
  unresolved, or omit the block entirely and file the backend gap — never synthesise a number the
  console cannot honestly compute. Scope labels for an unnamed account are `acct_<first8>`, never
  a raw 36-character UUID and never an invented name.

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
- Two ratchet tests gate this mechanically and must stay green: `class-budget.test.ts` (hand-
  written Tailwind utilities per component, `DEFAULT_BUDGET` 3, `BUDGET` map stays empty —
  entries are debt) and `base-ui-adoption.test.ts` (`KNOWN_GAPS` — entries may only shrink, never
  grow; `section-class-audit.test.ts` extends the same discipline to `sections/`).

## Composition — sections in the library, the shell mounted once, pages only in stories

**The library exports sections, never full pages** (owner correction 2026-08-25 — monolithic
`*Page` exports caused every route to remount its own shell, the "rebuilt on every navigation"
anti-pattern) — **unchanged by the 2026-08-30 shell revamp**:

- `packages/ui-web/src/sections/<kebab-name>/` holds **screen sections** — the zone-level
  compositions a route assembles: stat rows, dashboards (spend/latency/budget), ledger zones
  (keys, projects, review queue), toolbars, `PageHeader`, `ConsoleSidebar`. Sections are
  presentational only: **data via typed props, no fetching, no refine hooks, no routing**;
  callbacks are props. Each ships `fixtures.ts`, stories, and tests. Barrel region:
  `// ── sections`.
- **The shell mounts exactly once, in `apps/console`'s persistent layout** — `ConsoleShell` +
  `ConsoleSidebar`/`ConsoleTopBar` live in a route-group `layout.tsx`. There is no `@rail`/`@scope`
  parallel-route slot any more (deleted with the right rail, ADR 0012) — route pages compose
  sections and pass `BottomSheet`/`Dialog` state as ordinary props; they never render the shell.
  Navigating must not remount the sidebar/top-bar (this is testable: the nav DOM node persists
  across route changes — `shell-persistence.stories.tsx`).
- **Full-page compositions exist in exactly two places**: (1) Storybook — page-level stories under
  `src/pages-stories/` that compose sections inside the shell with mock fixtures; these remain the
  e2e acceptance surface (populated/empty/loading/error/role/mobile variants, `addon-a11y`-clean)
  for checking a feature per page without starting the app, and are the ground truth in place of
  the deleted SVG mockups; and (2) `apps/console`'s route implementations. There is **no `*Page`**
  component in the package barrel.
- **One style pipeline**: `apps/console`'s `globals.css` imports the package's stylesheet
  (`@lightbridge/ui-web/styles.css`, which imports `theme.css`); the app never re-declares
  fonts/tokens or runs a duplicate base layer.

## Refine-driven mock screens

Beside the fixture-driven page stories, `src/refine-mock/` hosts a Storybook-only harness:
`@refinedev/core`'s `<Refine>` with a **mock data provider** over the section fixtures (simulated
latency, optional error mode), plus thin container components that drive the pure sections
from refine hooks (`useTable`/`useList`/`useForm`/`useOne`) exactly the way `apps/console` will.
Stories under the `Refine` title group (`Refine/Projects`, `Refine/ApiKeys`, …) demonstrate live
list→selection→edit/decide flows. Rules: the sections stay pure (containers adapt hook state
to props); the mock provider is never exported from the package barrel; deps on `@refinedev/*`
are devDependencies only.

## State — URL-first via nuqs (ADR 0011)

- In `apps/console`, **view state lives in the URL** through nuqs (`useQueryState`/
  `useQueryStates`, typed parsers, defaults kept out of the URL): scope, filters,
  range/bucket/group-by, selections, active tabs, `BottomSheet`/dialog open state. There is no
  provider/context for this — one route reads its own params directly.
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

Cards on the floor with no `PageHeader`/`Card` structure · an empty inspector rail column (hide it
instead) · a side-docked sheet at any tier (bottom sheet below `lg`, the rail at `lg`+) · borders
or shadows anywhere except `Card`'s hairline, table hairlines, control borders and the chart
baseline · a second accent colour · orange as decoration or large fill · green/red deltas · pills/badges ·
rounded-full · spinners · uppercase labels · mono type for non-data prose/chrome ·
a centered empty-state placard for anything OTHER than a settled, genuinely first-run empty query
(that's `InlineStatus`'s job) · empty-state copy inside an SVG `<text>` ·
a native `<select>` (use `SelectField`) · a floating overlay without the shared overlay class ·
a hand-drawn chevron (use `Chevron`) ·
re-declaring a type-role class instead of importing its `type-roles.ts` constant · a raw account
UUID as a visible label · pie/donut charts (use `ShareBar`) · hex colours in components ·
React Native imports · a chart framework dependency · `dark:` variants or a `.dark` class ·
`tailwind.config.js` in `ui-web` or `apps/console` (Tailwind v4 is CSS-first) ·
importing `@radix-ui/*` directly · `vaul`, anywhere · hand-written focus traps or roving
`tabIndex` · a `cva.ts` that only encodes boolean state · pagers rendered with no `onPrev`/
`onNext` wired · a fabricated or permanently-null figure where an em dash or an omitted block
(plus a filed backend issue) is the honest answer.
