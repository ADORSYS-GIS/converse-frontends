/**
 * The automatic half of the runtime accessibility gate (#443).
 *
 * `expectNoA11yViolations` is the explicit, per-assertion form. This is the form that needs no
 * assertion at all: one `afterEach` in a package's Vitest setup file turns EVERY render test in
 * that package into an accessibility test, with no edit to any of them. That matters more than it
 * sounds — a gate that has to be remembered per test file is a gate that is 80% applied within a
 * quarter, and the components most likely to be missed are the new ones.
 *
 * ## Why this needs `sequence.hooks: 'list'`
 *
 * Vitest's default `afterEach` order is `'stack'` — reverse registration. Testing Library
 * registers its own auto-`cleanup` when a test file imports it, which is AFTER a setup file runs,
 * so under `'stack'` cleanup fires FIRST and this hook always finds an empty `<body>`. That is not
 * a loud failure; it is a gate that silently passes everything, which is worse than no gate.
 * Measured directly while building this: under `'stack'` the sweep reported 0 violations across
 * all 1517 `packages/ui-web` tests; under `'list'`, the same run reported 17 — three of them real
 * component defects (`DonutChart`'s `nested-interactive`, `CommandPalette`'s
 * `aria-required-children`, and an `aria-prohibited-attr` in a test fixture). Every Vitest project
 * that installs this sweep therefore sets `sequence: { hooks: 'list' }`, and that setting is not
 * optional decoration.
 *
 * ## What it checks
 *
 * `document.body`, after the test body has run and before Testing Library tears it down: WCAG 2.1
 * AA, `color-contrast` disabled (jsdom cannot compute it — see `a11y.ts`). Tests that render
 * nothing are skipped, so pure-logic files cost nothing.
 */
import type { afterEach as AfterEach } from 'vitest';

import { expectNoA11yViolations, type A11yRunOptions } from './a11y';

let skipRules: A11yRunOptions['rules'] | null = null;
let skipEntirely = false;

/**
 * Opt the CURRENT test out of the sweep, or relax one rule for it. Resets after every test, so it
 * has to be called inside the test body (or its own `beforeEach`), never at module scope.
 *
 * Reach for it only when the DOM under test is a deliberate fragment that cannot be valid on its
 * own — a `<td>` rendered without its `<table>`, a hook fixture. A component that fails a rule
 * when rendered the way callers render it is a defect; silencing that here hides it from the
 * ratchet as well as from the gate.
 *
 * ```ts
 * it('measures the row height', () => {
 *   relaxA11ySweep({ reason: 'renders a bare <tr> to measure it', rules: { list: { enabled: false } } });
 *   …
 * });
 * ```
 */
export function relaxA11ySweep(options: { reason: string; rules?: A11yRunOptions['rules'] }): void {
  if (!options.reason) throw new Error('relaxA11ySweep needs a reason');
  if (options.rules) skipRules = { ...skipRules, ...options.rules };
  else skipEntirely = true;
}

/**
 * Install the sweep. Call once, from a Vitest `setupFiles` module, passing that module's OWN
 * `afterEach`:
 *
 * ```ts
 * import { afterEach } from 'vitest';
 * import { installA11ySweep } from '@lightbridge/ui-web/src/test/a11y-sweep';
 *
 * installA11ySweep(afterEach);
 * ```
 *
 * The hook is a PARAMETER rather than an import in this file, deliberately. Under pnpm a consuming
 * app resolves `vitest` from its own `node_modules` while this module — which lives in
 * `packages/ui-web/src` and is compiled by the CONSUMER's Vite — resolves it from
 * `packages/ui-web/node_modules`. When those are two module instances, registering into the wrong
 * one fails silently: the hook never runs and every test passes. Taking the caller's own
 * `afterEach` removes the question entirely, and costs one argument.
 *
 * ## Verify a new installation, do not assume it
 *
 * Every failure mode of this sweep is SILENT — it passes everything. Both were hit while building
 * it, and neither announced itself: `sequence.hooks` left at `'stack'` (cleanup first), and, in a
 * `projects` config, `sequence` written inside the project entry, where Vitest ignores it in
 * favour of the root's. After wiring a new package in, render one deliberately broken thing (an
 * `<img src>` with no `alt` is enough) and watch the test FAIL before deleting the probe.
 */
export function installA11ySweep(afterEach: typeof AfterEach): void {
  afterEach(async () => {
    const skipped = skipEntirely;
    const rules = skipRules;
    skipEntirely = false;
    skipRules = null;

    if (skipped) return;
    // Nothing was rendered (a pure-logic test, or one that already unmounted): nothing to check.
    if (!document.body.firstElementChild) return;

    try {
      await expectNoA11yViolations(document.body, rules ? { rules } : {});
    } catch (error) {
      // Throwing out of an `afterEach` aborts the REMAINING `afterEach` hooks for that test —
      // including Testing Library's auto-cleanup, which under `hooks: 'list'` is queued behind
      // this one. The rendered tree would then survive into the next test and turn one honest
      // accessibility failure into a cascade of "found multiple elements" errors in unrelated
      // tests, which is how a real finding gets misread as a flaky suite. Clearing the body first
      // costs nothing (the run is failing regardless) and keeps the report readable: one failure,
      // naming one component.
      document.body.replaceChildren();
      throw error;
    }
  });
}
