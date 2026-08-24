/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  presets: [require('@lightbridge/ui/tailwind-preset')],
  content: ['./src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
    // Mobile-first ladder (ADR 0009 Decision 6, console-ui skill "Shape and layout"): replaces
    // Tailwind's default `sm`/`md`/`lg`/`xl`/`2xl` scale entirely (not `extend`d) with the two
    // breakpoints the console actually designs for, matching `@lightbridge/ui`'s
    // `designTokens.breakpoint` (`compact: 600` -> `md`, `full: 1024` -> `lg`).
    screens: {
      md: '600px',
      lg: '1024px',
    },
    extend: {
      // ADR 0009 Decision 6 tiers: base = phone, `md` = 600 (persistent left rail returns),
      // `lg` = 1024 (full three-panel shell). Kept byte-identical with
      // `apps/console/tailwind.config.js` — the console compiles this package's source through its
      // own Tailwind pass, so a divergence here would silently move the tier boundaries between
      // Storybook and the real app. `sm`/`xl`/`2xl` keep Tailwind's defaults.
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
