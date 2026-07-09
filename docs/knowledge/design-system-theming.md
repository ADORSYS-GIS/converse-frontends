# Design system & theming

How colour, layout, and light/dark work in the self-service console, and how to build new UI that stays consistent. Decision record: [ADR 0007](../adr/0007-console-visual-theme-system.md).

## Palette

The palette is defined **twice** and the two copies **must stay identical**:

| Source | File | Consumed by |
| --- | --- | --- |
| CSS variables (`--color-*`) | `packages/ui/tailwind-preset.js` | NativeWind className tokens — `bg-surface`, `text-ink`, `border-border`, `bg-primary/10`, … |
| Inline JS palette | `apps/self-service/src/theme/theme-colors.ts` | `useThemeColors()` → `style={{ color: colors.x }}`, Ionicons `color={…}` |

> ⚠️ **When you change a colour, change it in both files.** They drifted once (the inline copy kept the old accent after the CSS side was recalibrated), which is what produced the "dark island" bug. `theme-colors.ts` carries a sync comment; the theme tests assert values don't leak across themes.

Tokens (light / dark):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `primary` | `#3E63DD` | `#7DA0FF` | Actions, links, active state — **never** as a full-bleed fill |
| `accent` | `#6B4FD6` | `#A48BF0` | Secondary emphasis |
| `secondary` | `#DB7A34` | `#E0975A` | Warm accent |
| `success` / `error` | `#2F9E6B` / `#DD4B4B` | `#46C58B` / `#F0736F` | Semantic only (kept separate from the accent) |
| `ink` / `soft` / `subtle` | `#151A21` / `#5B6472` / `#9AA2AF` | `#E8EAED` / `#A2ABB8` / `#6B7280` | Text hierarchy |
| `muted` / `surface` / `border` | `#F5F6F8` / `#FFFFFF` / `#E6E8EC` | `#0F1216` / `#181C22` / `#2A2F37` | Page ground / cards / hairlines |

Soft tints (`brandSoft`, `accentSoft`, `successSoft`, …) are `bg-<token>/10` — they cascade automatically, so recalibrating a base token updates its tints.

**Prefer className tokens** (`<Div tone="surface">`, `<Text intent="bodyStrong">`) over inline `colors.*`. Reach for `useThemeColors()` only where a value must be passed as a prop (e.g. an Ionicons `color`).

## Layout — the centered shell

Content sits in a centered column (max `1040px`, the `designTokens.layout.maxContentWidth` token) on desktop and goes edge-to-edge on mobile. This is wired into the shared primitives, so you get it for free:

- **`<Scroll>`** centres its content by default. Opt out with `container={false}` for a screen that manages its own width.
- **`<PageHeader>`** and **`<Pagination>`** centre their inner content to the same column, so header / body / footer align.

Don't add per-screen `maxWidth`; compose these primitives.

## Text intents

`<Text intent="…">` — `eyebrow`, `title`, `body`, `bodyStrong`, `caption`, `value`, and **`display`** (the large ink hero number on metric cards). Surface-white variants (`inverse*`) exist but are for coloured grounds — after the redesign, prefer a **surface hero card** (`display` on `bg-surface`) over a saturated fill.

## Theming (light / dark)

One provider owns everything:

- **`ThemePreferenceProvider`** (`apps/self-service/src/theme/theme-preference.tsx`) — wraps the app in `_layout.tsx`. It:
  - resolves the **effective scheme** (`preference === 'system' ? OS : preference`),
  - toggles the NativeWind `.dark` class on the web root from that scheme (this is what makes className tokens go dark),
  - persists the preference to `localStorage` with a synchronous read at startup (no flash), guarded for non-web.
- **`useThemeColors()`** resolves inline colours from the **same effective scheme** — so inline and className styling can never disagree.
- **`useThemePreference()`** → `{ preference, setPreference, scheme }` for UI that reads or sets the theme.
- **`useEffectiveColorScheme()`** → `'light' | 'dark'`; falls back to the OS scheme when no provider is mounted (keeps isolated renders/tests working).

Users pick the theme via the **Appearance** control in Settings (`components/theme-toggle.tsx`, Light / Dark / System).

### Verifying dark mode
Dark is class-driven, not `prefers-color-scheme` directly. In the browser preview, `colorScheme: 'dark'` + reload flips the app (the provider effect reads `matchMedia`); confirm with `document.documentElement.classList.contains('dark')`.

## Do / don't

- ✅ Compose `Scroll` / `PageHeader` / `Pagination` — don't hand-roll containers or max-widths.
- ✅ Use `tone` / `intent` className tokens; keep `useThemeColors()` for prop-passed colours only.
- ✅ Check every new screen in **both** themes.
- ❌ Don't use `primary` (or any accent) as a large solid fill — use a surface card with an accent chip.
- ❌ Don't edit only one palette source.
- ❌ Don't read `useColorScheme()` directly for styling — read the effective scheme so the theme toggle is honoured.

## Upgrade notes (from the pre-#91 UI)

Shipped in **#91** (palette + shell + hero cards + component cleanups), **#92** (theme unification + inline-palette recalibration), **#93** (Settings toggle). If you have branches predating these:

- Replace any full-bleed `Div tone="brand"` banner with a surface hero card (`Card` + `Text intent="display"` + a soft accent chip).
- Remove per-screen `maxWidth` wrappers; rely on `Scroll`/`PageHeader`.
- Replace direct `useColorScheme()` styling with `useThemeColors()` / `useEffectiveColorScheme()`.
- If you added palette values, mirror them in **both** `tailwind-preset.js` and `theme-colors.ts`.
