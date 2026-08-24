/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  presets: [require('@lightbridge/ui/tailwind-preset')],
  content: ['./src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
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
