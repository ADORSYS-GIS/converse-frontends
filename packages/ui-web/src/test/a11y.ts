/**
 * The runtime half of the accessibility gate (owner directive 2026-09-03, issue #443:
 * "accessibility is a GATE, not a panel"). The other two halves are `eslint-plugin-jsx-a11y` in
 * the root `eslint.config.js` (static) and `parameters.a11y.test = 'error'` in
 * `.storybook/preview.tsx` (real browser, contrast included). Full map:
 * `docs/knowledge/accessibility.md`.
 *
 * `axe-core` directly rather than `vitest-axe`: that wrapper's last release (0.1.0) predates
 * Vitest 1 and declares a `vitest@^0.x` peer, so adopting it would mean pinning a matcher library
 * three majors behind the runner it plugs into. The whole of what it adds is one assertion and a
 * violation formatter, which is this file.
 *
 * ## Rule set
 *
 * WCAG 2.1 AA — `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`. Nothing else: axe's `best-practice`
 * tag carries opinions (heading order, landmark uniqueness) that are worth reading but are not the
 * conformance bar this gate enforces, and enabling them here would make the ratchet in
 * `a11y-violations.test.ts` measure taste rather than conformance.
 *
 * ## `color-contrast` is DISABLED here, and only here
 *
 * jsdom implements no layout and no cascade resolution: `getComputedStyle` returns the declared
 * value, never a used value, and every element has a zero-sized box. axe's `color-contrast` check
 * needs the rendered foreground/background pair and the rendered font size to pick the 4.5:1 vs
 * 3:1 threshold, so under jsdom it either bails out as "incomplete" or reports against colours no
 * user ever sees. Neither is a finding. Contrast is caught in the ONE place it can be measured for
 * real — the Storybook run in a real browser, in BOTH themes, where this rule is left ON. Never
 * "fix" a contrast finding by consulting this file; it does not produce them.
 */
import axe, { type AxeResults, type ElementContext, type Result, type RunOptions } from 'axe-core';

/** WCAG 2.1 level A + AA. The conformance bar, and the only tags this gate asserts on. */
export const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

/**
 * Rules turned off for jsdom runs. Exactly one entry, and it is a tooling limit rather than an
 * accepted risk — see the file header. If this map ever grows a second entry, that entry needs a
 * written reason here AND a line in `docs/knowledge/accessibility.md`.
 */
export const JSDOM_UNCOMPUTABLE_RULES: RunOptions['rules'] = {
  'color-contrast': { enabled: false },
};

export interface A11yRunOptions {
  /**
   * Extra axe rule overrides, merged over `JSDOM_UNCOMPUTABLE_RULES`. Use this ONLY to silence a
   * rule that the fragment under test cannot satisfy in isolation (a `<td>` rendered without its
   * `<table>`, say), and say why at the call site. Silencing a rule the component genuinely fails
   * is a defect, not a configuration.
   */
  rules?: RunOptions['rules'];
}

/** One violation, flattened to the single line a failure message wants. */
function formatViolation(violation: Result): string {
  const targets = violation.nodes
    .slice(0, 3)
    .map((node) => node.target.join(' '))
    .join(', ');
  const more = violation.nodes.length > 3 ? ` (+${violation.nodes.length - 3} more)` : '';
  return `  [${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}\n      at ${targets}${more}\n      ${violation.helpUrl}`;
}

/**
 * Run axe over `container` and return the raw results. Prefer `expectNoA11yViolations` — this is
 * exported for the ratchet test, which needs the violation LIST rather than a pass/fail.
 */
export async function runA11y(
  container: ElementContext,
  options: A11yRunOptions = {}
): Promise<AxeResults> {
  return axe.run(container, {
    runOnly: { type: 'tag', values: [...WCAG_21_AA_TAGS] },
    rules: { ...JSDOM_UNCOMPUTABLE_RULES, ...options.rules },
    // axe's own `resultTypes` trim: we only ever read `violations`, and asking it to build the
    // `passes`/`incomplete` node lists for every rule roughly doubles the per-run cost. With
    // hundreds of render tests each running this, that is the difference between a gate people
    // keep and one they delete.
    resultTypes: ['violations'],
    // Do not descend into `<iframe>`s. axe's frame traversal posts a message into each frame's
    // `contentWindow` and asserts it is a real, same-origin window; jsdom gives an `<iframe src>`
    // pointing anywhere off-origin a `contentWindow` that fails that assertion, and axe throws
    // rather than skipping — which took out five `apps/lci` tests (`GrafanaPanel` and its two
    // callers, which embed real Grafana `d-solo` URLs) the first time this gate ran. Nothing is
    // lost: a jsdom iframe never loads its document, so there was never anything inside to audit.
    // Embedded content's own accessibility is the embedded app's gate, not ours.
    iframes: false,
  });
}

/**
 * Assert that `container` has no WCAG 2.1 AA violations. Throws with the rule id, impact, the
 * offending selectors and the deque help URL for each — enough to act on without re-running.
 *
 * ```ts
 * const { container } = render(<Thing />);
 * await expectNoA11yViolations(container);
 * ```
 *
 * The container must be attached to `document` (Testing Library's `render` attaches it): axe walks
 * the live tree, and a detached node yields a silent pass.
 */
export async function expectNoA11yViolations(
  container: ElementContext,
  options: A11yRunOptions = {}
): Promise<void> {
  const results = await runA11y(container, options);
  if (results.violations.length === 0) return;

  const lines = results.violations.map(formatViolation).join('\n');
  throw new Error(
    `Expected no WCAG 2.1 AA violations, found ${results.violations.length}:\n${lines}\n\n` +
      `Contrast is not checked here (jsdom cannot compute it) — see packages/ui-web/src/test/a11y.ts.`
  );
}
