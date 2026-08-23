import type { ColorSchemeName } from 'react-native';

// Inline-style counterpart of the CSS-variable palette in
// packages/ui/tailwind-preset.js — MUST stay in sync with it. `useThemeColors`
// reads these for `style={{ color: colors.x }}` / Feather icon tints, while
// className tokens (bg-surface, text-ink…) read the CSS variables. The two are
// kept identical so a component never mixes a light inline color with a dark
// className token (or vice versa).
// `chrome` (header/nav tonal layer, ADR 0008 Decision 5) sits alongside `muted` (floor) and
// `surface` (floating panels) — see tailwind-preset.js's matching CSS-variable comment for the
// full palette rationale, including why only `.dark` gets the ADR's literal values.
const lightColors = {
  primary: 'rgb(62 99 221)', // #3E63DD
  secondary: 'rgb(219 122 52)', // #DB7A34
  accent: 'rgb(107 79 214)', // #6B4FD6
  error: 'rgb(221 75 75)', // #DD4B4B
  success: 'rgb(47 158 107)', // #2F9E6B
  ink: 'rgb(21 26 33)', // #151A21
  soft: 'rgb(91 100 114)', // #5B6472
  subtle: 'rgb(154 162 175)', // #9AA2AF
  muted: 'rgb(245 246 248)', // #F5F6F8
  surface: 'rgb(255 255 255)', // #FFFFFF
  border: 'rgb(230 232 236)', // #E6E8EC
  chrome: 'rgb(245 246 248)', // #F5F6F8 — no ADR-0008 light direction; reuses `muted`
};

const darkColors = {
  primary: 'rgb(218 92 44)', // #DA5C2C — the ADR's single accent (CTA/active only)
  secondary: 'rgb(224 151 90)', // #E0975A
  accent: 'rgb(164 139 240)', // #A48BF0
  error: 'rgb(240 115 111)', // #F0736F
  success: 'rgb(70 197 139)', // #46C58B
  ink: 'rgb(232 234 237)', // #E8EAED
  soft: 'rgb(162 171 184)', // #A2ABB8
  subtle: 'rgb(107 114 128)', // #6B7280
  muted: 'rgb(0 0 0)', // #000000 — floor
  surface: 'rgb(25 25 25)', // #191919 — floating panels
  border: 'rgb(42 47 55)', // #2A2F37
  chrome: 'rgb(17 17 17)', // #111111 — header/nav
};

export function getThemeColors(scheme: ColorSchemeName) {
  return scheme === 'dark' ? darkColors : lightColors;
}
