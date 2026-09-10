/**
 * Next runs this file's top level in the BROWSER, once, before the app hydrates
 * (`instrumentation-client.ts`, a stable convention since Next 15.3; this app is on 16.3.2). It is
 * the client-side counterpart to `instrumentation.ts`, which only ever runs on the server.
 *
 * The only thing here is the dev-time accessibility reporter (#443): axe over the live DOM,
 * findings in the console, so a violation is visible while the screen is being built rather than
 * only in CI. `packages/ui-web/src/dev/axe-reporter.ts` explains why it is a small module of ours
 * rather than `@axe-core/react` — that package's whole mechanism is `ReactDOM.findDOMNode`, which
 * React 19 removed.
 *
 * ## Dev tooling, not a feature flag
 *
 * `process.env.NODE_ENV` is literal-substituted by the bundler, so in a production build this is
 * `if ('production' === 'development')` — the branch, this module's dynamic `import()`, and
 * `axe-core` behind it are all dropped. Verified by grepping `.next/` after `pnpm --filter lci
 * build:web`; the command and its output are in `docs/knowledge/accessibility.md`.
 */
if (process.env.NODE_ENV === 'development') {
  void import('@lightbridge/ui-web/src/dev/axe-reporter').then(({ startDevA11yReporter }) =>
    startDevA11yReporter({ appName: 'lci' })
  );
}
