/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        soft: 'rgb(var(--color-soft) / <alpha-value>)',
        subtle: 'rgb(var(--color-subtle) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        // Header/nav tonal layer (ADR 0008 Decision 5) — distinct from `surface` (floating
        // panels). Only the dark palette gets the ADR's literal Axiom-derived value; the ADR
        // specifies no light-mode direction, so light `chrome` reuses the existing light `muted`
        // neutral rather than inventing an unspecified value.
        chrome: 'rgb(var(--color-chrome) / <alpha-value>)',
        // Fourth tonal step above `surface` (console redesign spec §2.1 `--raised`): active nav
        // row, active segmented cell, table hairlines, skeleton blocks. Same "no ADR-0008 light
        // direction" situation as `chrome` — light `raised` is a one-step-up neutral chosen to
        // read as "raised" against light `surface`/`muted`, not a literal spec value (the spec is
        // dark-only).
        raised: 'rgb(var(--color-raised) / <alpha-value>)',
      },
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        // Recalibrated palette: one calm-but-confident accent (#3E63DD, was the
        // electric #1D5BFF) reserved for actions/links/active state — never used
        // as full-bleed fills. Neutrals carry a deliberate cool-slate bias so
        // they read as chosen, not defaulted. Semantic hues sit apart from the
        // accent and are lightly desaturated.
        ':root': {
          '--color-primary': '62 99 221', // #3E63DD
          '--color-secondary': '219 122 52', // #DB7A34
          '--color-accent': '107 79 214', // #6B4FD6
          '--color-error': '221 75 75', // #DD4B4B
          '--color-success': '47 158 107', // #2F9E6B
          '--color-ink': '21 26 33', // #151A21
          '--color-soft': '91 100 114', // #5B6472
          '--color-subtle': '154 162 175', // #9AA2AF
          '--color-muted': '245 246 248', // #F5F6F8
          '--color-surface': '255 255 255', // #FFFFFF
          '--color-border': '230 232 236', // #E6E8EC
          '--color-chrome': '245 246 248', // #F5F6F8 — no ADR-0008 light direction; reuses `muted`
          '--color-raised': '236 238 241', // #ECEEF1 — no ADR-0008 light direction; one step up from `surface`
        },
        // ADR 0008 Decision 5 (visual direction, Axiom reference lock): near-black canvas with
        // tonal surface layers — floor (`muted`) → header/nav (`chrome`) → floating panels
        // (`surface`) — and a single accent (`primary`) reserved for CTAs/active states, never
        // decoration. This supersedes ADR 0007's light-first `#3E63DD`/cool-slate dark palette as
        // the direction for this revamp; `ink`/`soft`/`subtle`/`border`/`secondary`/`accent`/
        // `error`/`success` are unchanged (out of ADR 0008's explicit palette, and `accent` here
        // is this codebase's separate "secondary emphasis" token, not the ADR's "single accent" —
        // that maps to `primary`, per the nav-item CVA notes).
        '.dark': {
          '--color-primary': '218 92 44', // #DA5C2C — the ADR's single accent (CTA/active only)
          '--color-secondary': '224 151 90', // #E0975A
          '--color-accent': '164 139 240', // #A48BF0
          '--color-error': '240 115 111', // #F0736F
          '--color-success': '70 197 139', // #46C58B
          // Refined to the console-redesign spec (docs/design/console-redesign/README.md §2.1):
          // ink/soft/subtle/border move from ADR 0008's original cool-slate values to the
          // exact Axiom-cross-checked figures the Next.js console spec locks.
          '--color-ink': '238 238 238', // #eeeeee — --strong
          '--color-soft': '180 180 180', // #b4b4b4 — --body
          '--color-subtle': '96 96 96', // #606060 — --muted (spec name; tailwind token stays `subtle`)
          '--color-muted': '0 0 0', // #000000 — floor
          '--color-surface': '25 25 25', // #191919 — floating panels
          '--color-border': '58 58 58', // #3a3a3a — --line
          '--color-chrome': '17 17 17', // #111111 — header/nav
          '--color-raised': '32 32 32', // #202020 — fourth tonal step: active row, hairlines, skeletons
        },
      }),
  ],
};
