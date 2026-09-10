/**
 * Vite's `?raw` suffix — a module whose default export is the file's text.
 *
 * Declared here (rather than pulling in `vite/client`, which would also bring the whole
 * `ImportMetaEnv`/HMR surface into a package that has no use for either) for exactly one consumer:
 * `pages-stories/dashboard-from-spec.stories.tsx` reads `apps/console/dashboards.yaml` as TEXT so
 * the `Pages/FromSpec` story renders the REAL checked-in page entry rather than a copy of it —
 * "the fixture path IS the YAML" (converse-frontends#446).
 *
 * It is a data import, not a code one: nothing in `packages/ui-web` imports anything from
 * `apps/console`, so the dependency direction is unchanged.
 */
declare module '*.yaml?raw' {
  const contents: string;
  export default contents;
}
