# ADR 0007: Console visual redesign — recalibrated palette, shared layout shell, unified theming

## Status

Accepted

## Context

The self-service console (Expo + React Native Web, shipped as a pure web product) accumulated visual inconsistencies that a screenshot-driven review — enabled by the deployed Storybook (epic #67, ticket #72) — made concrete:

1. **No max-width container.** Every screen rendered `flex-1` with padding only, so content stretched edge-to-edge and read as broken on a desktop monitor.
2. **An over-saturated accent used as large fills.** The primary was an electric `#1D5BFF`, slapped as full-width banners (home "Current Usage", usage "Total Cost") and solid selection chips — garish against the otherwise calm surfaces.
3. **A split-brain theme.** Two theme signals were never synchronized:
   - NativeWind **className tokens** (`bg-surface`, `text-ink`, … → CSS variables in `packages/ui/tailwind-preset.js`) only go dark when a `.dark` class sits on the web root — and nothing applied it, so they stayed **light**.
   - The JS **`useThemeColors()`** inline palette (`apps/self-service/src/theme/theme-colors.ts`) read `useColorScheme()` and followed the **OS**.

   On a dark-mode OS the inline-styled parts went dark while className-styled parts stayed light, so the MCP builder (28 inline `colors.*` uses) rendered as a **dark island** on a light app. The palette also lived in these **two unsynchronized sources** — the inline copy still held the pre-redesign electric values after the CSS-variable side was recalibrated.

`packages/ui` is a uniform CVA + CSS-variable design system, so the correct fix was at the **token and shell level**, not per-screen restyling.

## Decision

Deliver a token-and-shell-level redesign plus a unified theme system:

- **Recalibrate the palette** to a calm-but-confident `#3E63DD` accent with cool-slate neutrals and lightly desaturated semantic colours, with a matching dark ramp. The accent is reserved for actions / links / active state and is **never used as a full-bleed fill**. Soft tints (`brandSoft` = `bg-primary/10`, …) cascade from the base tokens.
- **One centered content column.** A `maxContentWidth` design token (1040px); `Scroll` (opt-out `container` prop), `PageHeader`, and `Pagination` centre their content to it on desktop and stay edge-to-edge on mobile.
- **Hero metric cards** (a new `display` text intent) replace the saturated banners — the number is the ink hero on a surface card with a small accent chip.
- **Unify theming.** A single `ThemePreferenceProvider` owns the effective colour scheme (`preference → system`) **and** the NativeWind `.dark` class; `useThemeColors()` resolves from that same effective scheme. A Settings **Appearance** toggle (Light / Dark / System) persists the choice to `localStorage`.

## Consequences

- **The palette lives in two sources that MUST stay in sync**: the CSS variables in `packages/ui/tailwind-preset.js` (className tokens) and the inline copy in `apps/self-service/src/theme/theme-colors.ts` (used by `useThemeColors`). Both files carry a comment recording this, and `use-theme-colors` / `theme-preference` tests assert the values don't leak across themes. A future cleanup could generate one from the other.
- **Dark mode now engages app-wide** for the first time (previously it was effectively never rendered whole). Any new screen must be checked in both themes.
- **Inline `colors.*` and className tokens are now guaranteed consistent** because both derive from the single effective scheme owned by the provider.
- Delivered across **#91** (redesign: palette + shell + hero cards + component cleanups), **#92** (theme unification + inline-palette recalibration), and **#93** (Settings toggle), under epic **#67** / ticket **#72**.
- **Follow-ups:** proper i18n keys for the Appearance labels (currently `defaultValue` fallbacks); optionally collapse the two palette sources into one generated source; the MCP builder still uses inline styling internally (renders correctly under the synced tokens, so a full rewrite was deliberately deferred).

See [design-system-theming.md](../knowledge/design-system-theming.md) for the practical developer guide.
