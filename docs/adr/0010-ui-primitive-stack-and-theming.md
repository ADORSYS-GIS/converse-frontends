# ADR 0010: Console UI primitive stack (daisyUI · Base UI · cmdk · Floating UI) and two-theme centralized theming

## Status

Proposed — owner directive, 2026-08-25.

Extends [ADR 0009](0009-nextjs-console-replacement.md) Decision 5 (which is amended by a pointer
note) and applies under [ADR 0008](0008-console-shell-inversion-and-visual-direction.md)'s locked
visual direction. ADR 0008's rules are **not** re-decided here: radius 2, no shadows on panels,
mono numerics, one signal accent, status-as-text, flush full-height rails, "a scalar gets a panel,
a distribution gets the floor" all continue to bind. This ADR decides _what libraries produce that
look with the least hand-written code_, and _where the theme lives_.

**Amended by [ADR 0012](0012-console-visual-revamp.md)** (owner directive 2026-08-30): this
paragraph's restatement of ADR 0008's radius-2 and flush-full-height-rails doctrine no longer
holds — radius is now 8px (panels) / 4px (controls), and the flush right rail it describes is
deleted in favour of a two-column shell (`Card` as the default zone container, `DetailSheet` for
row detail). Nothing else in this document moves: the daisyUI/Base UI/cmdk/Floating UI primitive
stack, Tailwind v4, the `theme.css` single-source-of-truth rule, and the two-theme (`black` /
`wireframe`) model below are all still binding, including the mono-for-numerics rule wherever this
ADR states it **for data values** — ADR 0012 narrows that to "data only," it does not remove it.

## Context

`packages/ui-web` today is entirely hand-built: 30 component directories, each with
`component.tsx` + `cva.ts` + `types.ts` + stories + tests. That has produced a consistent surface,
but it also means we hand-write behaviour that is not our product:

- `typed-confirm-dialog/component.tsx` hand-rolls a modal: an `Escape` listener, a
  `querySelectorAll('input, button, [href], [tabindex]:not([tabindex="-1"])')` focus trap, manual
  `aria-modal`/`aria-labelledby` wiring, and manual initial focus. It has no scroll lock, no
  inert-background handling, and no focus restore on close.
- `segmented-control/component.tsx` hand-rolls roving `tabIndex` with an
  `ArrowRight/ArrowLeft/ArrowUp/ArrowDown/Home/End` switch and a `radiogroup`/`radio` role pair.
- `scope-select/component.tsx` styles two native `<select>` elements with `appearance-none`, which
  means the option list is unstyleable and cannot follow the theme.
- `chart-tooltip/component.tsx` positions itself by arithmetic — `left = x - width/2`, clamped to
  `containerWidth`, `top = y - estimatedHeight - 8` where `estimatedHeight` is
  `16 + (title ? 16 : 0) + rows.length * 18`. That estimate exists purely to avoid a
  measure-then-reposition flash; it is wrong whenever a row wraps, and it has no flip/shift
  behaviour near a viewport edge.
- There is **no command palette** at all, and no keyboard entry point to the console's resources.
- Everything is **dark-only**. `apps/console` never sets `.dark`-vs-light; ADR 0009 Decision 5
  records "runs dark-only at launch; the preset's `.dark` block is the operative ramp."

Owner directive (2026-08-25), verbatim intent:

> Add as primitive tools for the UI: **cmdk** (command palette); **radix-ui** — reduce our own
> boilerplate; **floating-ui** — virtual mouse move around d3 stuffs; **base-ui** + **daisyui**
> with the prebuilt themes **black** for dark and **wireframe** for light — to ensure the written
> components are as tiny as possible. Goal: a working version without much hand-written code, and
> a centralized theme / class management.

That directive introduces a **light theme**, which the console has never had, and asks for one
place that owns colour and class decisions.

### The constraint that forces the biggest call

daisyUI 5 is a Tailwind **v4** library. Its own installation guide is unambiguous:

> "You must use Tailwind CSS 4 with daisyUI 5." · "The `tailwind.config.js` file is deprecated in
> Tailwind CSS v4. Do not use `tailwind.config.js`."
> — <https://daisyui.com/llms.txt> § _Install daisyUI 5_, items 1–2

`packages/ui-web` and `apps/console` are both on `tailwindcss ^3.4.19` with a shared JS preset
(`packages/ui/tailwind-preset.js`) consumed via `presets: [...]` in two byte-identical
`tailwind.config.js` files. Base UI's docs carry the same signal from the other side:

> "The Tailwind CSS examples are written for Tailwind CSS v4. If `package.json` uses Tailwind CSS
> v3, automatically convert unsupported styles to v3-compatible equivalents."
> — <https://base-ui.com/llms.txt> § header

So "adopt daisyUI" is not a dependency addition; it is a Tailwind major-version decision.

### Registry state (checked 2026-08-25)

| Package                     | Latest          | React 19                       | Notes                                                           |
| --------------------------- | --------------- | ------------------------------ | --------------------------------------------------------------- |
| `daisyui`                   | **5.7.22**      | n/a (CSS only)                 | `dist-tags.latest`. v4 line ends at **4.12.24**                 |
| `@base-ui/react`            | **1.7.0**       | `^17 \|\| ^18 \|\| ^19`        | stable v1; `date-fns`/`@date-fns/tz` peers are `optional: true` |
| `@base-ui-components/react` | 1.0.0-rc.0      | —                              | **legacy name, do not use** — renamed to `@base-ui/react`       |
| `cmdk`                      | **1.1.1**       | `^18 \|\| ^19 \|\| ^19.0.0-rc` | deps: `@radix-ui/react-{dialog,id,primitive,compose-refs}`      |
| `@floating-ui/react`        | **0.27.20**     | `>=17.0.0`                     |                                                                 |
| `radix-ui`                  | **1.6.7**       | `^16.8 \|\| … \|\| ^19.0`      | the unified single-package distribution                         |
| `tailwindcss`               | **4.3.3**       | n/a                            | `dist-tags`: `latest 4.3.3`, `v3-lts 3.4.19`                    |
| `vaul`                      | 1.1.2 (in tree) | `^16.8 \|\| … \|\| ^19.0.0`    | dep: `@radix-ui/react-dialog ^1.1.1` — **removed 2026-08-29**   |

Everything in the proposed stack supports React 19.2.3, which is what the workspace pins.

Note the transitive fact that shapes Decision 2: **Radix is already in this tree**, twice —
`vaul` and `cmdk` both depend on `@radix-ui/react-dialog`. (Once, since 2026-08-29: `vaul` is
gone and `cmdk` is the only Radix consumer left.)

## Decision

### 1. Tailwind v4 for the web surface only; the Expo app stays on v3 — hard cutover

`packages/ui-web` and `apps/console` move to **Tailwind CSS v4** (`tailwindcss@^4.3.3`) with
CSS-first configuration. Both `tailwind.config.js` files are **deleted**, not kept alongside.

`packages/ui` and `apps/self-service` **stay on Tailwind v3.4.19** with
`packages/ui/tailwind-preset.js` unchanged. They must: `nativewind@^4.2.6` is a Tailwind v3
toolchain, and `apps/self-service` is scheduled for deletion at cutover (ADR 0009 Follow-up 7)
anyway. Migrating a package we are about to delete would be pure waste.

Rejected alternative — **daisyUI 4.12.24 on Tailwind v3**. It works, and it does ship `black` and
`wireframe`. It was rejected because:

- daisy 4's theme API is `daisyui: { themes: [{ black: { … } }] }` inside `tailwind.config.js`,
  with colours stored as space-separated **HSL channel triplets** in `--p`/`--b1`/`--b2`/`--b3`
  style variables — a second, incompatible variable vocabulary that we would have to re-map, and
  that no current documentation describes.
- The v4 line is where every daisy component fix now lands; adopting v4-of-daisy on a v3 Tailwind
  is not possible, so the choice is "current library" vs "frozen library".
- It would still leave Base UI's Tailwind examples needing manual v3 downconversion on every use.
- Per house delivery doctrine, a compatibility path that exists only to defer a version bump is
  exactly the dormant-code shape we do not ship.

The v3 → v4 mechanics, all inside phase 1:

- `@import "tailwindcss";` replaces `@tailwind base/components/utilities` in
  `packages/ui-web/src/styles.css`.
- Content globs become `@source` directives — `apps/console` needs
  `@source "../../packages/ui-web/src";` to keep compiling `ui-web` source through its own pass
  (today's `content: ['…', '../../packages/ui-web/src/**/*.{ts,tsx}']`).
- `screens.md/lg` become `@theme { --breakpoint-md: 600px; --breakpoint-lg: 1024px; }`;
  `fontFamily.mono/sans` become `--font-mono` / `--font-sans`. The ADR 0009 Decision 6 tier
  values are unchanged, and the "the two configs must agree" invariant becomes "there is one
  theme file, imported by both."
- The preset's `rgb(var(--color-x) / <alpha-value>)` indirection is a v3 idiom and **goes away**:
  in v4 a theme colour is a plain colour value and the opacity modifier works natively, so
  `bg-muted/80` (the dialog backdrop) keeps working.
- Known v3 → v4 behaviour changes to sweep in phase 1: bare `border`/`divide` default to
  `currentColor` (v3 defaulted to `gray-200`), `ring` defaults to 1px (v3: 3px), `outline-none` is
  renamed (`outline-hidden` is the v3 `outline-none` behaviour), and `shadow-sm`→`shadow-xs`
  renames (we use no shadows, so this is a no-op check). Tailwind's own upgrade codemod is run
  first and its diff reviewed by hand — this list is the manual re-check, not a substitute.
- daisy component classes are unprefixed by default. The one collision to watch is `table`, which
  is both a daisy component class and a Tailwind `display: table` utility; on a real `<table>`
  element the display value is already `table`, so it is benign. If a real collision appears,
  `@plugin "daisyui" { prefix: daisy-; }` is the escape hatch (llms.txt § _Configuration_) — but
  we do **not** prefix pre-emptively.

### 2. Role split: daisyUI is the class layer, Base UI is the behaviour layer, Radix stays transitive

Four libraries, four non-overlapping jobs. No primitive is served by two of them.

| Library              | Job                                                                                                                                                                                                                                               | Not its job                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **daisyUI 5**        | Semantic **class** and **theme** layer: `btn`, `input`, `select`, `table`, `menu`, `tabs`, `toggle`, `checkbox`, `radio`, `skeleton`, `fieldset`/`label`, `join`, `kbd`, `validator`, `stat`, `status`, and the `[data-theme]` variable machinery | Behaviour. daisy is CSS; it has no focus management |
| **Base UI 1.7**      | **Behaviour** primitives we author against: Dialog, Alert Dialog, Menu, Select, Combobox, Popover, Tooltip, Tabs, Toggle Group, Field/Fieldset/Form, Switch, Checkbox, Radio, Number Field, Scroll Area, Toast                                    | Looks. It ships no CSS                              |
| **cmdk 1.1.1**       | The **command palette** — one new component, nothing else                                                                                                                                                                                         | General primitives                                  |
| **Floating UI 0.27** | **Positioning** for anything anchored to a point rather than an element — chart tooltips over `<svg>`                                                                                                                                             | Anything Base UI already positions internally       |

**Base UI is the authoring API; `radix-ui` is not a direct dependency.** The owner named both, and
both answer the same need ("reduce our own boilerplate" / "components as tiny as possible") — so
picking one for our own code is the point, not a rejection of the other. Radix's role is recorded
explicitly as **vendored substrate**: `cmdk` and `vaul` both ride on `@radix-ui/react-dialog`, so
Radix ships in the console either way, and that is where it stays. We do not add `radix-ui` to any
`package.json`, and we do not import `@radix-ui/*` in `ui-web` source.

Why Base UI wins the authoring slot:

- One package for every primitive (`pnpm add @base-ui/react`), tree-shakable — versus Radix's
  per-primitive packages or its 1.6.7 unified bundle (Base UI quick-start, llms.txt § _Overview_).
- Styling model fits our token discipline exactly: unstyled, `className` accepts a **function of
  component state** (`className={(state) => …}`), plus `data-*` state attributes and per-component
  CSS variables for styling — so variants can be expressed as `data-checked:` / `data-highlighted:`
  Tailwind variants instead of CVA maps (llms.txt § _Handbook › Styling_ → `handbook/styling.md`,
  "Style hooks": CSS classes / Data attributes / CSS variables).
- It ships the primitives our redesign actually lacks — **Field**, **Fieldset**, **Form** (with
  consolidated error handling), **Combobox**, **Number Field**, **Toolbar**, **Scroll Area** —
  which map onto our `Field`/`ScopeSelect`/`ReportExportPanel` work directly.
- It is a stable 1.x (1.0.0 shipped 2025-12-11; 1.7.0 is current), and its docs are authored for
  Tailwind v4, which is where Decision 1 puts us.

**Escape hatch, recorded so nobody invents a third option:** if Base UI lacks a primitive we need,
use the unified `radix-ui` package for that one primitive. Do not add a fourth primitive library.

> **SUPERSEDED 2026-08-29 — the drawer is Base UI's, and `vaul` is gone.** What follows in this
> paragraph was written on 2026-08-25, when Base UI's Drawer was new and unexamined and the owner
> directive named `vaul`. Owner decision of 2026-08-29: use `@base-ui/react/drawer`. `vaul` is
> removed from `packages/ui-web/package.json` and imported nowhere; `BottomSheet` — and through it
> `SectionSheet` and `SelectionSheet` — is `Drawer.Root/Portal/Backdrop/Viewport/Popup/Content/
Title/Description/Close`. Two consequences worth recording, both read off a live browser rather
> than inferred:
>
> - **Radix now ships under `cmdk` alone.** The "two transitive Radix consumers" below is one.
> - **The modality is a different mechanism with the same failure mode.** Radix froze the page
>   with `pointer-events: none` on `<body>`; Base UI leaves `<body>` alone and instead renders
>   Floating UI's `InternalBackdrop` — an unclassable `position: fixed; inset: 0` press-absorber —
>   inside `Drawer.Portal`. A tier class must therefore hide the PORTAL: hiding the backdrop and
>   the panel leaves that layer over a page that looks perfectly normal. The `useIsBelowLg`/`Md`
>   gate that suppresses `open` itself is unchanged and still the primary defence.
>
> One thing genuinely improved: `Drawer.Root`'s `modal` prop is real and honoured, where vaul's
> never reached the Radix dialog under it. And Base UI ships no grab-bar part, so the sheet handle
> is our own element — which ended the standing bug where vaul's unlayered runtime `<style>`
> outranked the console's own handle paint and four `!important`s were holding it back.

**`vaul` stays** as the only drawer/bottom-sheet primitive, per the owner directive and the
console-ui skill's existing lock. Noted for later, not decided now: Base UI 1.7 ships its own
**Drawer** with swipe-to-dismiss, so a future consolidation could retire `vaul` and with it one of
the two transitive Radix consumers. That evaluation is phase 5 and is explicitly **not** in scope
here.

### 3. Theming: `black` and `wireframe` as customized bases, in exactly one file

`packages/ui-web/src/theme.css` becomes **the single source of truth for console colour**. It is
the only file in the web surface allowed to contain a colour literal. `styles.css` imports it;
`apps/console` imports `styles.css`. Nothing else defines a palette.

Its shape — daisy's built-in-theme customization API, which inherits every value we do not
override (llms.txt § _Change a built-in theme_):

```css
@import 'tailwindcss';
@source '../../../apps/console/src'; /* ui-web pass; console mirrors with its own @source */

@plugin 'daisyui' {
  themes:
    black --default,
    wireframe;
  logs: false;
}

@plugin 'daisyui/theme' {
  name: 'black'; /* dark  — default */ /* overrides below */
}
@plugin 'daisyui/theme' {
  name: 'wireframe'; /* light — user toggle */ /* overrides below */
}
```

`data-theme="black"` / `data-theme="wireframe"` on `<html>` selects the theme
(llms.txt § _Enable and apply themes_).

#### 3a. What the two stock themes already give us

Fetched from `https://cdn.jsdelivr.net/npm/daisyui@5/themes.css` and converted from OKLCH:

|                                     | `black` (stock)                   | `wireframe` (stock)               |
| ----------------------------------- | --------------------------------- | --------------------------------- |
| `color-scheme`                      | `dark`                            | `light`                           |
| `--color-base-100`                  | `oklch(0% 0 0)` = **#000000**     | `oklch(100% 0 0)` = #FFFFFF       |
| `--color-base-200`                  | `oklch(19% 0 0)` ≈ #141414        | `oklch(97% 0 0)` ≈ #F5F5F5        |
| `--color-base-300`                  | `oklch(22% 0 0)` ≈ #1B1B1B        | `oklch(94% 0 0)` ≈ #EBEBEB        |
| `--color-base-content`              | `oklch(87.6% 0 0)` ≈ #D6D6D6      | `oklch(20% 0 0)` ≈ #161616        |
| `--color-primary`                   | `oklch(35% 0 0)` ≈ #3A3A3A (grey) | `oklch(87% 0 0)` ≈ #D4D4D4 (grey) |
| `--radius-selector / -field / -box` | `0rem / 0rem / 0rem`              | `0rem / .25rem / .25rem`          |
| `--depth` / `--noise`               | `0` / `0`                         | `0` / `0`                         |

Two things make these the right bases and not an arbitrary pick:

1. `black`'s `--color-base-100` is **literally `#000000`** — our floor, exactly.
2. Both ship `--depth: 0` and `--noise: 0`, so daisy adds **no shadow and no grain** to any
   component. ADR 0008's "no `box-shadow` anywhere" survives the adoption without a fight.

What must change: both themes' `--color-primary` is a **grey** (they are deliberately achromatic
themes), and neither radius set is our 2px.

#### 3b. The mapping table — our tokens onto daisy variables

Our vocabulary is richer than daisy's base ramp (we have four tonal layers plus a line colour;
daisy offers three `base-*` steps). The resolution is a fixed convention, applied identically in
both themes:

> **`base-100` = floor · `base-200` = panel · `base-300` = raised · `neutral` = chrome.**
> The remaining tokens (`border`, `ink`, `soft`, `subtle`) keep their own names as first-class
> theme variables in the same selector.

This is what centralizes "class management": a component may write either a daisy class (`btn`,
`input`) or a token utility (`bg-surface`, `text-soft`) and both resolve through the same
variables — so **every existing `ui-web` component keeps compiling unchanged** through the
migration, and stays correct after it.

| Tailwind token | Spec name      | daisy variable            | Dark (`black`) | Light (`wireframe`) |
| -------------- | -------------- | ------------------------- | -------------- | ------------------- |
| `muted`        | `--floor`      | `--color-base-100`        | `#000000`      | `#EBEBEB`           |
| `chrome`       | `--chrome`     | `--color-neutral`         | `#111111`      | `#F5F5F5`           |
| `surface`      | `--panel`      | `--color-base-200`        | `#191919`      | `#FFFFFF`           |
| `raised`       | `--raised`     | `--color-base-300`        | `#202020`      | `#DEDEDE`           |
| `border`       | `--line`       | `--color-border` _(ours)_ | `#3a3a3a`      | `#CFCFCF`           |
| `subtle`       | `--muted`      | `--color-subtle` _(ours)_ | `#606060`      | `#8A8A8A`           |
| `soft`         | `--body`       | `--color-base-content`    | `#b4b4b4`      | `#4D4D4D`           |
| `ink`          | `--strong`     | `--color-ink` _(ours)_    | `#eeeeee`      | `#1A1A1A`           |
| `primary`      | `--signal`     | `--color-primary`         | `#DA5C2C`      | `#B4441C`           |
| —              | text on signal | `--color-primary-content` | `#0d0d0d`      | `#FFFFFF`           |
| —              | text on chrome | `--color-neutral-content` | `#eeeeee`      | `#1A1A1A`           |

Also pinned in both theme blocks:
`--radius-selector: 0.125rem; --radius-field: 0.125rem; --radius-box: 0.125rem;` (= 2px, ADR 0008's
radius, so `rounded-box`/`rounded-field`/`rounded-selector` and every daisy component obey it),
`--border: 1px`, `--depth: 0`, `--noise: 0`.

Tokens daisy has no slot for (`chrome`, `raised` in name, `border`, `subtle`, `ink`) are declared
as ordinary custom properties in the same `[data-theme=…]` selector and registered once in
`@theme` so Tailwind emits `var()`-based utilities that re-resolve on theme switch — the mechanism
daisy itself documents for CDN themes ("define the same variables in a selector … The selector
must match the selected `data-theme`", llms.txt § _Change a built-in theme_). Phase 1 must verify
the exact `@theme` registration form against a real build before the rest of the phases proceed.

**Recorded a11y finding.** `button/cva.ts` currently renders the primary variant as
`bg-primary text-ink` — `#eeeeee` on `#DA5C2C` is **3.26:1**, below AA for normal text, and daisy's
own rule 9 requires "`*-content` colors must have clear contrast with their related colors"
(llms.txt § _daisyUI color rules_). Near-black on `#DA5C2C` is **5.14:1**. Phase 1 therefore sets
`--color-primary-content: #0d0d0d` in `black`, and the console-ui skill's "`ink` — … text on the
accent" line is amended to "text on the accent is `primary-content`, not `ink`." The signal hex
itself is untouched.

#### 3c. The preset single-source rule splits — recorded explicitly

ADR 0009 Decision 5 says `ui-web` "consumes `@lightbridge/ui`'s `tailwind-preset.js` as-is — the
palette … stays the single source of truth. `ui-web` adds no second palette copy." **That rule now
has a boundary:**

- `packages/ui/tailwind-preset.js` remains the single source of truth for **`packages/ui` and
  `apps/self-service`** (the Expo/NativeWind surface, Tailwind v3), unchanged by this ADR.
- `packages/ui-web/src/theme.css` becomes the single source of truth for **`packages/ui-web` and
  `apps/console`** (the DOM surface, Tailwind v4 + daisyUI).
- `packages/ui-web` **stops consuming the preset entirely** — no `presets:` array survives the
  `tailwind.config.js` deletion. There is no second copy and no sync obligation: they are two
  palettes for two runtimes with two different lifespans, and the Expo one is scheduled for
  deletion at cutover (ADR 0009 Follow-up 7). At that point one of the two sources disappears and
  the single-source rule is whole again.
- The chart constants in `packages/ui-web/src/chart-tokens.ts` (`SPEC_GREY_RAMP`, `SPEC_GRID`,
  `SPEC_BASELINE`, `SPEC_TEXT_*`, `SPEC_SURFACE`, `SPEC_FLOOR`) are **hex literals passed to SVG
  attributes** and cannot be Tailwind classes. They become the one sanctioned exception: phase 1
  converts them to read the CSS variables (`getComputedStyle`-free — via `var(--color-…)` in the
  SVG `fill`/`stroke` attributes where the attribute accepts it, otherwise a
  `useThemeChartTokens()` hook reading the resolved custom properties once per theme change).
  `chart-core`'s DOM-free _math_ (`seriesColor`'s accent/rank decision) still comes from
  `@lightbridge/ui` verbatim, exactly as ADR 0009 Decision 5 requires.

> **Status amendment, 2026-08-31 (#368):** the Expo surface named throughout this section —
> `packages/ui` and `apps/self-service` — was removed in the cutover this section anticipated. The
> preset single-source rule is therefore whole again, per the last bullet above: `theme.css` is now
> the repo's only palette source. The body above is left as written for history; it is no longer
> current.

### 4. Component-shrink policy

For every **new** and every **rewritten** component in `packages/ui-web`, in this order:

1. **A daisy class if one exists** (`btn`, `input`, `select`, `table`, `menu`, `tabs`, `toggle`,
   `skeleton`, `fieldset`/`label`, `join`, `kbd`, `validator`, `stat`, `status`) — plus Tailwind
   utilities for anything daisy does not cover, per daisy usage rule 2.
2. **A Base UI primitive for behaviour**, styled with those classes via `className` (including
   `className` as a function of state) and `data-*` variants.
3. **A CVA map only when a genuine multi-axis variant set survives** step 1. A `cva.ts` whose
   variants are just `active`/`error` booleans is deleted in favour of `data-*` variants.
4. Hand-written a11y behaviour (focus traps, roving tabindex, `aria-*` wiring) is **deleted**, not
   kept as a fallback.

The visual contract does not relax. daisy is tuned to ADR 0008, not the other way round: the theme
block pins radius 2 and `--depth: 0`; components still get no shadows, no pills, no second accent,
no green/red deltas, no badges (`status` is available but our rule remains **status is text**), and
`btn-primary` remains reserved for the one signal action per view (daisy colour rule 10 says the
same thing independently: "Use `primary` only for the most important element on the page. Use it
only once.").

### 5. The light theme is first-class, with a user toggle

`wireframe`-derived light is a real theme, not a courtesy. Rules:

- **Default is `black`.** Resolution order for a session: stored preference → `prefers-color-scheme`
  → `black`. A blocking inline script in the `apps/console` root layout sets
  `document.documentElement.dataset.theme` before first paint so there is no flash; the toggle
  lives in `ConsoleHeader` and writes both the attribute and `localStorage`. daisy's
  `theme-controller` class (a checked checkbox/radio whose `value` is a theme name, llms.txt
  § _Theme controller_) is the CSS-only mechanism; we do not use it, because Next.js needs the
  pre-hydration script for the no-flash guarantee and we want the preference persisted.
- **The inversion holds in both themes.** Content is still the floor, chrome still floats above
  it. In light that means the floor is the _grey_ (`#EBEBEB`) and panels are _white_ — daisy's
  `base-200` is therefore lighter than `base-100` in the light theme. That is deliberate and is
  the rule: `base-100`/`base-200` step **away from the floor's luminance** (lighter in dark,
  lighter in light), while `raised` and `border` step **toward greater contrast against the panel
  they mark** (lighter in dark, darker in light).
- **Light tokens were derived by luminance-contrast parity with the dark ramp**, not picked by
  eye. `subtle` is 2.90:1 against the light floor (dark: 2.8:1 — same deliberately-quiet role);
  `border` is 1.56:1 against the panel (dark: 1.55:1); `soft` is 8.5:1 and `ink` is 15:1 against
  the panel, matching dark.
- **The chart grey ramp gets a light mirror.** `SPEC_GREY_RAMP` is
  `#b4b4b4 → #7c7c7c → #565656 → #3a3a3a` at 10.1 / 5.0 / 2.9 / 1.9 : 1 against the dark floor.
  The light ramp is the set of greys hitting those same four ratios against `#EBEBEB`:

  | Series rank                 | Dark      | Light     |
  | --------------------------- | --------- | --------- |
  | 1                           | `#b4b4b4` | `#363636` |
  | 2                           | `#7c7c7c` | `#636363` |
  | 3                           | `#565656` | `#8B8B8B` |
  | 4+                          | `#3a3a3a` | `#AFAFAF` |
  | gridlines (`raised`)        | `#202020` | `#DEDEDE` |
  | baseline (`border`)         | `#3a3a3a` | `#CFCFCF` |
  | tick labels (`subtle`)      | `#606060` | `#8A8A8A` |
  | accent / breach (`primary`) | `#DA5C2C` | `#B4441C` |

  `seriesColor`'s _behaviour_ — which rank gets the accent, how ranks cycle past 5 series — is
  unchanged; only the grey a rank resolves to is theme-dependent.

- **Every page story ships a light variant** and passes `addon-a11y` in both themes. That is
  phase 4's acceptance surface.

### 6. Command palette (cmdk) and pointer-anchored chart tooltips (Floating UI)

**cmdk** adds one new component, `CommandPalette`, opened with `⌘K`/`Ctrl-K`: jump to a page,
switch account/project scope, and run the scoped actions the right rail owns. It renders inside a
`surface` panel at radius 2, mono type, `kbd` classes for the shortcut hints, and no shadow.
cmdk brings `@radix-ui/react-dialog` transitively — that is the whole of Radix's presence in the
palette and it stays transitive (Decision 2).

> **Status amendment, 2026-08-31 (#368):** "radius 2" above no longer holds for this panel. Owner
> review of a Storybook-only restyle batch (`claude/sb-overlay-restyle`) ruled "10px looks good for
> the command palette" — wired in as the live default (`claude/wire-overlay-restyle`), and extended
> to every primitive in the same visual family rather than the palette alone: Menu popups (the
> account switcher, and any other Base UI Menu), Select/Combobox popups, and Popovers all now
> render at a 10px corner radius too (`--radius-overlay-floating`, `theme.css`;
> `OVERLAY_FLOATING_CLASS`/`OVERLAY_ANCHORED_POPUP_FLOATING_CLASS`, `lib/overlay.ts`), since they
> already share this exact `surface`/hairline/no-shadow chrome and a palette-only radius would have
> read as an inconsistency, not a decision. The exception is scoped to FLOATING overlays only —
> an anchored popup pointing at a trigger from an arbitrary screen position. Every DOCKED overlay
> (Dialog, the bottom sheet Drawer, Tooltip) is unaffected and stays at the flush 2px contract:
> they anchor to a screen edge or centre over the whole viewport rather than pointing at one
> element, so the "floating" read this exception answers does not apply. See the console-ui
> skill's "Shape and layout" section for the full, current statement of this rule.
>
> Two further, narrower departures shipped in the same batch, reviewed and kept deliberately
> rather than extended anywhere else: `CommandPalette`'s own group headings render upper-cased
> (against this ADR's/ADR 0012's sentence-case rule) and its empty-query line renders in
> `font-mono` (against the "mono is data only" rule) — both scoped to that one component alone.

**Floating UI** replaces the arithmetic in `chart-tooltip`. Two documented pieces do the work:

- A **virtual element** — "a plain object that has a `getBoundingClientRect` method" — is what
  anchors a floating element to a point rather than a DOM node, with `contextElement` set to the
  chart's real `<svg>` "to ensure clipping and position update detection works as expected"
  (<https://floating-ui.com/docs/virtual-elements>). This is the mechanism for "virtual mouse move
  around d3 stuffs": SVG marks are not elements we can anchor to individually, but a pointer
  position is a rect.
- `useClientPoint(context)` from `@floating-ui/react` "positions the floating element at a given
  client point (x, y), usually generated by a mouse event", tracks the cursor by default, accepts
  explicit `x`/`y` (which is how we snap to the nearest datum instead of the raw cursor), and
  supports `axis: 'x' | 'y'` for snapping to one axis only — the right behaviour for a time-series
  crosshair. Its docs also state the requirement we already meet: a non-interactive floating
  element must set `pointer-events: none` (<https://floating-ui.com/docs/useClientPoint>).

With `flip`/`shift` middleware the `estimatedHeight` guess and the `containerWidth` clamp both
disappear, and the tooltip stops mispositioning when a row wraps or the chart sits near a viewport
edge.

## Consequences

**Good**

- The four highest-risk hand-written behaviours (modal focus trap, roving tabindex, native-select
  styling, tooltip position math) are deleted and replaced by tested, maintained primitives.
- Most `cva.ts` files stop existing; variants become `data-*` Tailwind variants or daisy modifier
  classes.
- One file owns colour for the whole web surface, and a second theme costs a variable block rather
  than a codebase sweep.
- Both themes gain `color-scheme` (`dark`/`light`), so native scrollbars, form controls and
  autofill follow the theme for free.
- daisy's `--depth: 0` / `--noise: 0` means the library's default look already agrees with
  ADR 0008's no-shadow rule.

**Costs and risks**

- A Tailwind major upgrade across two packages, done in one PR. Risk is concentrated in phase 1
  and is bounded by an existing, complete Storybook: every component and every page has a story,
  so a visual regression has somewhere to show up.
- The workspace runs two Tailwind majors until the Expo cutover. Mitigated by them sharing no
  build: `packages/ui-web` stops consuming the v3 preset entirely.
- Two themes doubles the a11y and visual-review surface. Phase 4 exists for exactly that.
- Four new direct dependencies (`daisyui`, `@base-ui/react`, `cmdk`, `@floating-ui/react`); three
  are runtime JS. Base UI is tree-shakable and cmdk/Floating UI are small, but bundle size becomes
  something to watch on the console's client-first budget (ADR 0009 Decision 7).
- `black`/`wireframe` are _bases_, not the final look — a stock-daisy screenshot is not what we
  ship, and reviewers should not expect one.

**Neutral**

- Radix's version surface is now managed by `cmdk` and `vaul` rather than by us (by `cmdk` alone
  since the 2026-08-29 drawer swap). If we ever need a Radix primitive directly, Decision 2's
  escape hatch says use `radix-ui`, not a fourth library.

## Alternatives considered

- **daisyUI 4.12.24 on Tailwind v3.** Rejected — see Decision 1.
- **Radix as the authoring API, Base UI not adopted.** Rejected: Radix is per-primitive packages
  (or a 1.6.7 unified bundle) with no Field/Form/Combobox/Number Field/Toolbar equivalents, and
  its docs are not written against the Tailwind version we are moving to. It stays as the
  substrate under `cmdk`/`vaul` (Decision 2), which is the part of the owner's "radix-ui — reduce
  our own boilerplate" that actually pays.
- **Both Base UI and Radix as authoring APIs.** Rejected explicitly: two competing primitive APIs
  for the same job is the boilerplate the directive is trying to remove.
- **Keep hand-rolling; add only cmdk + Floating UI.** Rejected: it leaves the focus trap, the
  roving tabindex and the unstyleable native selects in place, and gives no theme layer — it
  answers neither half of the directive.
- **A hand-written light theme with no daisy.** Rejected: the directive names `wireframe`, and a
  second theme is precisely the work daisy's `[data-theme]` machinery removes.
- **Base UI Drawer instead of `vaul`, now.** Deferred to phase 5 — the directive keeps `vaul`, and
  swapping the drawer primitive in the same change as a Tailwind major is more risk than the
  saving is worth. **Reversed 2026-08-29** (see the note in Decision 2): the objection was about
  bundling the swap with the Tailwind major, and that major has long landed. Done as its own
  change, on its own branch, with its own browser verification.
- **daisy class prefix (`prefix: daisy-`) from day one.** Rejected as pre-emptive; recorded as the
  escape hatch if a real collision appears.

## Follow-ups — phased, sized as agent tasks

Each phase is one PR, each has a stated acceptance surface. Phases are sequential: 2, 3 and 4 all
assume 1 has landed.

**Phase 1 — theme layer + tokens bridge.** Tailwind v4 in `packages/ui-web` and `apps/console`;
delete both `tailwind.config.js`; create `packages/ui-web/src/theme.css` with the `black`/
`wireframe` overrides and the token registrations from Decision 3b; run the upgrade codemod and
hand-review the v3→v4 sweep list; wire the `data-theme` toggle in `ConsoleHeader` plus the
pre-hydration script in the console root layout; move `chart-tokens.ts` off hex literals; set
`--color-primary-content`. **Acceptance:** every existing story renders in `black` indistinguishably
from `main`; `pnpm build` (real web export) is green; `pnpm test` and `pnpm typecheck` green;
no component file contains a hex colour.

**Phase 2 — forms, dialog, menu on Base UI + daisy classes.** Rewrite, per
`docs/design/console-redesign/PRIMITIVES.md`: `Field` → Base UI Field/Fieldset + `input`/`textarea`

- `validator`; `Button` → `btn` (+ `btn-primary`/`btn-ghost`, `cva.ts` deleted); `ScopeSelect` →
  Base UI Select ×2 (native `<select>` and `appearance-none` gone); `SegmentedControl` → Base UI
  Toggle Group (roving-tabindex code deleted); `TypedConfirmDialog` → Base UI Alert Dialog (focus
  trap, Escape listener and manual aria wiring deleted); `SubNav` → Base UI Tabs + `tabs`;
  `RowActionGroup` → Base UI Menu where a row overflows; `ReportExportPanel` toggles → Base UI
  Switch + `toggle`. **Acceptance:** each rewritten component's existing tests and stories still
  pass unmodified where the public prop API is unchanged; net line count in
  `packages/ui-web/src/components` goes **down**; no `querySelectorAll`-based focus management
  remains in the package.

**Phase 3 — `CommandPalette` (cmdk) + Floating UI chart tooltips.** New `command-palette`
component with `⌘K` binding, scope switching and page jumps, wired in `apps/console`; rewrite
`ChartTooltip` on `useFloating` + `useClientPoint` + a virtual element with `contextElement`, and
update the three chart consumers (`spend-series-chart`, `histogram-chart`, `latency-ridgeline`).
**Acceptance:** `estimatedHeight`/`containerWidth` arithmetic is gone; a tooltip near a viewport
edge flips instead of clipping; palette story covers empty query, no results, and keyboard-only
navigation.

**Phase 4 — light theme QA.** A light story variant for every component and every page view; fix
every dark-assuming class the sweep finds; `addon-a11y` clean in both themes; contrast spot-checks
against the Decision 5 table. **Acceptance:** every story in `packages/ui-web` renders in
`wireframe` without a hardcoded-dark artifact, and the a11y addon reports no new violations in
either theme beyond the accepted `subtle`-on-metadata contrast exemption.

**Phase 5 — DONE 2026-08-29, having been deferred here.** Replace `vaul` with Base UI Drawer,
removing one of the two transitive Radix consumers. Landed with the owner decision recorded in
Decision 2; the console-ui skill's drawer lock now names Base UI. **Acceptance, all met:** `vaul`
absent from every `package.json` and imported nowhere; the `lg`/`md` gates verified in a real
browser across a live resize; the sheet handle's computed style matches the contract in both
themes with no `!important`; class budget down (307 → 305), not up.

## References

- Owner directive, 2026-08-25 (this ADR's source of truth for intent).
- daisyUI 5 documentation index: <https://daisyui.com/llms.txt> — sections used: _Install daisyUI 5_,
  _daisyUI 5 usage rules_, _Change a component in CSS_, _daisyUI utilities and variables_,
  _Base modules_, _Configuration_, _daisyUI 5 colors_ (color names, color rules, _Enable and apply
  themes_, _daisyUI custom theme with custom colors_, _Change a built-in theme_), and the component
  entries for Button, Drawer, Dropdown, Fieldset, Input, Join, Kbd, Menu, Modal, Select, Skeleton,
  Stat, Status, Tab, Table, Theme controller, Toggle, Tooltip, Validator.
- Stock theme values: <https://cdn.jsdelivr.net/npm/daisyui@5/themes.css> (`[data-theme=black]`,
  `[data-theme=wireframe]`).
- Base UI documentation index: <https://base-ui.com/llms.txt> — plus
  <https://base-ui.com/react/handbook/styling.md> and
  <https://base-ui.com/react/overview/quick-start.md>.
- Floating UI: <https://floating-ui.com/docs/virtual-elements>,
  <https://floating-ui.com/docs/useClientPoint>.
- [ADR 0008](0008-console-shell-inversion-and-visual-direction.md),
  [ADR 0009](0009-nextjs-console-replacement.md),
  [design spec](../design/console-redesign/README.md),
  [migration map](../design/console-redesign/PRIMITIVES.md).
