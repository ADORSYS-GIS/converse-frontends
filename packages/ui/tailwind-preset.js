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
          '--color-ink': '232 234 237', // #E8EAED
          '--color-soft': '162 171 184', // #A2ABB8
          '--color-subtle': '107 114 128', // #6B7280
          '--color-muted': '0 0 0', // #000000 — floor
          '--color-surface': '25 25 25', // #191919 — floating panels
          '--color-border': '42 47 55', // #2A2F37
          '--color-chrome': '17 17 17', // #111111 — header/nav
        },
      }),
  ],
};
