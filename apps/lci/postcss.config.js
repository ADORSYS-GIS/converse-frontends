// Tailwind v4 uses a dedicated PostCSS plugin package — see docs/adr/0010-ui-primitive-stack-and-theming.md
// Decision 1. Mirrors apps/console's own postcss.config.js.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
