/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,tsx}',
    '../../packages/ui/**/*.{js,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],
  darkMode: 'class',
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
      },
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ':root': {
          '--color-primary': '29 91 255',
          '--color-secondary': '249 115 22',
          '--color-accent': '124 58 237',
          '--color-error': '239 68 68',
          '--color-success': '16 185 129',
          '--color-ink': '17 24 39',
          '--color-soft': '107 114 128',
          '--color-subtle': '156 163 175',
          '--color-muted': '247 247 248',
          '--color-surface': '255 255 255',
          '--color-border': '229 231 235',
        },
        '.dark': {
          '--color-primary': '96 165 250',
          '--color-secondary': '251 146 60',
          '--color-accent': '167 139 250',
          '--color-error': '248 113 113',
          '--color-success': '52 211 153',
          '--color-ink': '243 244 246',
          '--color-soft': '209 213 219',
          '--color-subtle': '156 163 175',
          '--color-muted': '17 24 39',
          '--color-surface': '31 41 55',
          '--color-border': '55 65 81',
        },
      }),
  ],
};
