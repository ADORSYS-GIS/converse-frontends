---
name: console-ui
description: UI structure contract for the Next.js console and packages/ui-web components. Use whenever building, reviewing, or restyling anything in packages/ui-web or apps/console — shell layout, panels, tables, charts, forms, stat cards, empty/loading/error states. Encodes the ADR 0008/0009 visual direction and the docs/design/console-redesign spec.
---

# Console UI structure

You are building the Lightbridge console: an Axiom-derived dark observability-style surface.
The full contracts live in the repo — **read them before writing components**:

- `docs/design/console-redesign/README.md` — token sheet, shell grid, component inventory with
  per-component contracts, screen specs, interaction contracts. This is the primary spec.
- `docs/adr/0008-console-shell-inversion-and-visual-direction.md` — locked visual direction and
  its status-note amendments.
- `docs/adr/0009-nextjs-console-replacement.md` — platform decisions (DOM, chart ports, refine).
- The SVG mockups beside the spec (`overview.svg`, `api-keys.svg`, `manage-projects.svg`,
  `admin-budget-review.svg`, `shell-compact.svg`) are the rendered ground truth — match them.

## The one-paragraph mental model

Content is the floor; chrome floats above it. The page is `#000`; floating panels (`#191919`)
carry navigation and parameters; the centre content sits **directly on black** — never in a card.
Separation is tonal, never lines, never shadows. Mono type everywhere structural; a single orange
`#DA5C2C` that appears only when something is actionable or needs attention. **A scalar gets a
panel, a distribution gets the floor.**

## Tokens — use the Tailwind semantic tokens, never hex

Palette single-source is `packages/ui/tailwind-preset.js` (CSS variables, `.dark` block).
`packages/ui-web` consumes it. Mapping to the spec's names:

| Tailwind token | Spec name | Dark value | Role |
| --- | --- | --- | --- |
| `muted` | `--floor` | `#000000` | Page background. Never a card fill |
| `chrome` | `--chrome` | `#111111` | Header, form-control inset fill, table row hover |
| `surface` | `--panel` | `#191919` | Floating panels, stat cards, bottom sheet |
| `raised` | `--raised` | `#202020` | Active nav row, active segmented cell, table hairlines, skeletons |
| `border` | `--line` | `#3a3a3a` | Control borders, chart baseline, group separators |
| `subtle` | `--muted` | `#606060` | Labels, placeholders, disabled. Never load-bearing info (2.8:1) |
| `soft` | `--body` | `#b4b4b4` | Body text, meter fills, rank-1 chart series |
| `ink` | `--strong` | `#eeeeee` | Headings, key numerals, text on the accent |
| `primary` | `--signal` | `#DA5C2C` | CTA · active · breach. Never decoration, never a large fill |

Write `bg-surface text-soft border-border`, not hex. If a needed step is missing from the preset,
extend the preset (both light and dark) — do not inline a hex value.

## Type

Two families only: **IBM Plex Mono** for everything structural (nav, labels, headings, table
cells, all numerics, buttons) and **Inter 400** for sentence-prose only. Roles (size/leading):
`page-title` 22 mono ink · `panel-title` 16 mono ink · `metric` 22–26 mono ink · `row` 12 mono ·
`meta` 11 mono · `label` 10 mono uppercase tracked (.09em) subtle · `prose` 10–11 Inter.
Numerics are right-aligned; thousands use thin space (`$1 131.80`); currency always two decimals.

## Shape and layout

- Radius `2px` everywhere. No pills, no `rounded-full`.
- No `box-shadow` anywhere. No borders on panels — only form controls (`border`), table
  hairlines (`raised`), and the chart baseline get strokes.
- Spacing scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`. Rail panels pad 16, centre panels 20,
  32 only for >600px prose panels.
- **Mobile-first** (ADR 0009 Decision 6): author base styles for phones and scale up with the
  `md:` (600) / `lg:` (1024) screens defined in ui-web's tailwind config. Never desktop-first
  overrides.
  - Base (<600, a designed target): single column, 16px gutters, header stays; nav spine docks
    as **bottom navigation**; right-rail content and nav overflow open as **vaul drawers**;
    stat cards stack; ledgers scroll horizontally inside their own `overflow-x-auto` container
    (the page never scrolls sideways); charts full-width.
  - `md` (600–1024): persistent left rail returns; right rail docks as a vaul bottom drawer.
  - `lg` (≥1024) full shell at 1440 reference: header h56 `chrome`; left rail x16 w208 (a
    **stack** of panels: nav spine, then scope/sub-nav); centre x248 w872 on the floor; right
    rail x1144 w280, **persistent, never an overlay** — its content retargets on selection.
  - The visual language (floor/panels/tokens/accent rules) is identical at every tier.
- **All drawers and bottom sheets are vaul** (`vaul`'s `Drawer`) — the console's only drawer
  primitive. Never hand-roll a sheet; style vaul's parts with the semantic tokens (`surface`
  content, `muted/80` overlay, radius 2, no shadow).
- The right rail owns the action that consumes its own parameters (`New key`,
  `Generate report`, review decisions). Row-scoped actions stay in the row.
- Admin nav group: preceded by a `raised` rule + `ROLE` marker; hidden entirely for non-admins.

## Charts

DOM `<svg>` only — no chart framework. Math comes verbatim from
`@lightbridge/ui/src/components/chart-core` (scales, bins, `seriesColor`, ramp constants).
Monochrome ramp by series rank (`#b4b4b4 → #7c7c7c → #565656 → #3a3a3a+`); orange at most once
per chart, only for the selected/breached series. Gridlines `raised`, baseline `border`, tick
labels 9px. Meters: 4px `raised` track, `soft` fill, `primary` only past the warning threshold.

## States

- **Empty**: an inline mono status line above still-rendered structure (headers/axes stay).
  Never a centered placard, never an illustration.
- **Loading**: skeleton blocks (`raised`) matching final geometry. No spinners, no shimmer.
- **Error**: a `primary`-coloured mono line in place of the value with an inline `Retry` ghost.
- **Status is text, never a pill**; counts go in tab labels, never badges.
- **Deltas are never green/red** — direction is glyph + wording in greys.

## Component conventions (packages/ui-web)

- Directory per component: `src/components/<kebab-name>/` with `component.tsx`, `cva.ts`
  (when variants exist), `types.ts`, `index.ts`, `component.stories.tsx`, and
  `component.test.tsx` (vitest + testing-library). Mirror `packages/ui`'s idiom: CVA +
  `tailwind-merge` via the package's `cn()`.
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

## Page views — full screens in Storybook

Every console screen exists as a **pure page view** in `packages/ui-web/src/pages/<kebab-name>/`
(`overview`, `api-keys`, `manage`, `admin-budget-review`, `auth`), composed from the component
inventory:

- A page view is presentational only: **all data arrives via typed props; no fetching, no
  refine hooks, no routing** — `apps/console` wires data in later. Callbacks (`onSelectSeries`,
  `onRequestRefill`, …) are props.
- Each page ships realistic **mock fixtures** in `fixtures.ts` beside the view (currency values
  like `$142.55 of $500.00`, plausible model/project names, enough rows to show density), and a
  `component.stories.tsx` rendering the full page at shell width — these page stories are the
  acceptance surface for "is this feature correctly implemented on this page" **without starting
  the app**.
- Page stories must cover the states that matter per the spec: default (populated), empty,
  loading (skeletons), error, and role variants where relevant (Admin nav visible/hidden),
  plus the compact tier where the layout changes (right rail as bottom sheet).
- Match the corresponding SVG mockup in `docs/design/console-redesign/` — the story should be
  visually comparable 1:1.
- Every page ships a **mobile story** (~390px viewport via Storybook viewport parameters)
  proving the mobile-first base layout: bottom nav, vaul drawers, stacked cards, scrollable
  ledger.
- Barrel region for these: `// ── pages`.

## Refine-driven mock screens

Beside the fixture-driven page stories, `src/refine-mock/` hosts a Storybook-only harness:
`@refinedev/core`'s `<Refine>` with a **mock data provider** over the page fixtures (simulated
latency, optional error mode), plus thin container components that drive the pure page views
from refine hooks (`useTable`/`useList`/`useForm`/`useOne`) exactly the way `apps/console` will.
Stories under the `Refine` title group (`Refine/Manage`, `Refine/ApiKeys`, …) demonstrate live
list→selection→edit/decide flows. Rules: the page views stay pure (containers adapt hook state
to props); the mock provider is never exported from the package barrel; deps on `@refinedev/*`
are devDependencies only.

## Never do

Card-wrapped centre content · borders or shadows on panels · a second accent colour · orange as
decoration or large fill · green/red deltas · pills/badges · rounded-full · spinners ·
centered empty-state placards · hex colours in components · React Native imports · a chart
framework dependency.
