// Tailwind v4 uses a dedicated PostCSS plugin package (`@tailwindcss/postcss`) instead of the
// bare `tailwindcss` plugin — see docs/adr/0010-ui-primitive-stack-and-theming.md Decision 1.
// `autoprefixer` is dropped: Tailwind v4's engine (Lightning CSS) already handles vendor
// prefixing, and running a second, redundant prefixer is a v3 idiom.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
