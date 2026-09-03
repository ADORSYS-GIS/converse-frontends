/**
 * Dev-time accessibility reporting in the running app: axe over the live DOM, debounced behind a
 * `MutationObserver`, findings grouped in the browser console (#443, owner directive 2026-09-03).
 *
 * ## Why this exists instead of `@axe-core/react`
 *
 * `@axe-core/react` was the obvious answer and it does not work here. Its whole mechanism is
 * `ReactDOM.findDOMNode(component)` (`dist/index.js:244`) — walking React's own render output to
 * find the nodes to audit. **React 19 removed `findDOMNode`**, and this workspace is pinned to
 * `react`/`react-dom` 19.2.8 (`pnpm-workspace.yaml` overrides). The call is inside a `try/catch`,
 * so the failure is not even loud: every checked component logs "axe error: could not check node"
 * and NOTHING is ever audited. Adding it would have looked like coverage and delivered none.
 *
 * What `@axe-core/react` adds over plain `axe-core` is the React-fiber traversal it can no longer
 * do. The rest — debounce, re-run on change, console grouping — is this file, in about forty
 * lines, with no dependency that cannot work.
 *
 * ## This is DEV TOOLING, not a feature flag
 *
 * Every caller guards the import with its bundler's own build-time development constant
 * (`process.env.NODE_ENV === 'development'` in the Next apps, `import.meta.env.DEV` in the Vite
 * ones) and imports this module DYNAMICALLY. Both constants are literal-substituted at build time,
 * so the guard folds to `if (false)` and the whole branch — this module and `axe-core` with it —
 * is dropped by the bundler. `apps/authz-ui` matters most: its production bundle is served under
 * `default-src 'self'` with no `data:` carve-out (#407) and is checked by
 * `scripts/verify-css-csp.mjs`. Proof that it stays out is a grep of each build's output, recorded
 * in `docs/knowledge/accessibility.md`; re-run it if this file's import shape ever changes.
 */

/** Same rule set the test gates assert on — one bar, three places, no drift. */
const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Long enough that a burst of renders settles into one run; short enough to feel immediate. */
const DEFAULT_DEBOUNCE_MS = 1000;

export interface DevA11yReporterOptions {
  /** Debounce between the last DOM mutation and the audit. */
  debounceMs?: number;
  /** Label prefixing every console group, so two apps in two tabs stay distinguishable. */
  appName?: string;
}

/** Undoes a `startDevA11yReporter` call: disconnects the observer and cancels a pending audit. */
export type StopDevA11yReporter = () => void;

const NOOP: StopDevA11yReporter = () => {};

/**
 * Start the reporter. Safe to call more than once — the second call is a no-op — and safe on the
 * server, where it returns immediately because there is no `document` to observe. Returns a
 * disposer; an app never needs it (the page outlives the reporter), tests do.
 */
export async function startDevA11yReporter(
  options: DevA11yReporterOptions = {}
): Promise<StopDevA11yReporter> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return NOOP;

  const scope = window as typeof window & { __lightbridgeDevA11y?: true };
  if (scope.__lightbridgeDevA11y) return NOOP;
  scope.__lightbridgeDevA11y = true;

  const { debounceMs = DEFAULT_DEBOUNCE_MS, appName = 'lightbridge' } = options;
  const axe = (await import('axe-core')).default;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  const audit = async () => {
    // One audit at a time: axe mutates the document while it measures (it injects and removes
    // its own probe nodes), and a second concurrent run both slows the page and produces
    // findings against a DOM the first run is halfway through.
    if (running) return;
    running = true;
    try {
      const results = await axe.run(document, {
        runOnly: { type: 'tag', values: WCAG_21_AA_TAGS },
        resultTypes: ['violations'],
      });
      if (results.violations.length === 0) return;
      console.groupCollapsed(
        `%c${appName} · ${results.violations.length} accessibility violation(s)`,
        'color:#DA5C2C;font-weight:600'
      );
      for (const violation of results.violations) {
        console.groupCollapsed(
          `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`
        );
        console.log(violation.helpUrl);
        // The NODES, not a selector string: a logged element is clickable straight into the
        // inspector, which is the entire advantage of catching this in the browser rather than in
        // a test.
        for (const node of violation.nodes) {
          console.log(node.target.join(' '), node.element ?? node.html);
        }
        console.groupEnd();
      }
      console.groupEnd();
    } catch (error) {
      // `axe-core` is a singleton with one global run lock, so ANY other axe user on the page —
      // the Storybook a11y addon, a test harness — makes `axe.run` throw "Axe is already running"
      // here. That is contention, not a defect: back off and take the next mutation instead of
      // filling the console with a warning nobody can act on.
      if (error instanceof Error && error.message.includes('already running')) return;
      console.warn(`${appName}: dev accessibility audit failed`, error);
    } finally {
      running = false;
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(audit, debounceMs);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  schedule();

  return () => {
    observer.disconnect();
    if (timer) clearTimeout(timer);
    delete scope.__lightbridgeDevA11y;
  };
}
