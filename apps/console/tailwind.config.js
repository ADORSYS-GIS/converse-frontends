/**
 * Mirrors `packages/ui-web/tailwind.config.js` exactly — the console compiles `ui-web`'s source
 * through its own Tailwind pass, so the two configs have to agree or the components render against
 * breakpoints they were never authored for. Palette comes from `@lightbridge/ui`'s preset, which
 * stays the single source of truth (ADR 0009 Decision 5).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  presets: [require('@lightbridge/ui/tailwind-preset')],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui-web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ADR 0009 Decision 6 tiers: base = phone, `md` = 600 (persistent left rail returns),
      // `lg` = 1024 (full three-panel shell). `sm`/`xl`/`2xl` keep Tailwind's defaults.
      screens: {
        md: '600px',
        lg: '1024px',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
