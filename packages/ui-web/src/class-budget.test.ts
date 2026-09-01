import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { DEFAULT_BUDGET, auditAll } from '../scripts/class-budget';
import type { ClassAudit } from '../scripts/class-budget';

/**
 * "Tiny css classes per component (max 3, and cva adds max 2 per variant). All components use
 * daisyUI x Base UI." — the owner's bar, 2026-08-29.
 *
 * Where it landed: **39 hand-written Tailwind utilities across 49 components, none over 3**, beside
 * 56 daisyUI classes and 71 named `@utility` parts. The route there was never "delete CSS" — it was
 * daisy for paint, Base UI for behaviour, shared `lib/` modules for what repeats, and a named part
 * in `theme.css` for every correction those need.
 *
 * The figures reported during that work — 1424 -> 651 -> 307 -> 249 -> 204 — came from a counter
 * that over-reported in four ways, measured at roughly 45% of any given number: it read comment
 * prose as classes (a backticked `aria-labelledby` looks exactly like one), charged `@utility`
 * names once per use site, counted occurrences rather than distinct classes, and counted import
 * specifiers. It was re-baselined on 2026-08-30 on the owner's call, deliberately as a separate
 * step so the old figures stay legible rather than being quietly restated. They are NOT comparable
 * with what this reports now. See `scripts/class-budget.ts` for exactly what changed.
 *
 * Re-measured 2026-08-30 (Phase 8, console visual revamp docs/ratchet pass): the two-column shell
 * landing (`ConsoleTopBar`, `ConsoleSidebar` folding the old rail/header components) moved the
 * count to 33 hand-written utilities across 50 components, none over 3, beside 54 daisyUI
 * classes and 78 named `@utility` parts.
 *
 * Re-measured 2026-08-31 (IA v3 Phase 6, closing docs/ratchets pass): the component count is
 * unchanged at 50 (IA v3's new screens — `ranked-series-rows`, `latency-stat-cards`, refill and
 * policy sections — live under `sections/`, which this file does not audit; see
 * `section-class-audit.test.ts`), but several existing components (the rail/shell/dialog work of
 * IA v3 phases 1-3) grew real per-viewer geometry — the count moved to **43 hand-written
 * utilities across 50 components, none over 3**, beside 54 daisyUI classes and 86 named
 * `@utility` parts — still zero `BUDGET` entries.
 */
const BUDGET: Record<string, number> = {
  // EMPTY — the bar is met. Every one of the 49 components sits at or under DEFAULT_BUDGET (3).
  //
  // An entry here is a debt with a number attached. Adding one back means a component started
  // hand-writing Tailwind again instead of reaching for a daisyUI class, a Base UI primitive, a
  // shared `lib/` module, or a named `@utility` part in `theme.css`. Prefer fixing that to adding
  // the entry.
};

const rows: ClassAudit[] = auditAll(join(import.meta.dirname, 'components'));

describe('class budget', () => {
  it.each(rows)(
    '$component stays within its budget ($utils utilities)',
    ({ component, utils }: ClassAudit) => {
      const budget = BUDGET[component] ?? DEFAULT_BUDGET;
      expect(
        utils,
        `${component} carries ${utils} hand-written utilities (budget ${budget}). ` +
          `Reach for a daisyUI component class, or lower the budget entry if you have removed some.`
      ).toBeLessThanOrEqual(budget);
    }
  );

  it('never lets a converted component regress past the default budget', () => {
    for (const { component, utils } of rows) {
      if (component in BUDGET) continue;
      expect(utils, `${component} has no budget entry and must stay lean`).toBeLessThanOrEqual(
        DEFAULT_BUDGET
      );
    }
  });
});
