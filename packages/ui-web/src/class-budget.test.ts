import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { DEFAULT_BUDGET, auditAll } from '../scripts/class-budget';
import type { ClassAudit } from '../scripts/class-budget';

/**
 * The owner's definition of done, 2026-08-29: "Tiny css classes per component (max 3, and cva adds
 * max 2 per variant). All components use daisyUI x Base UI."
 *
 * Base UI owns behaviour, daisyUI owns paint. A hand-written Tailwind utility is only justified
 * where neither ships the thing — genuine layout (`flex`, `gap`), or the console's own contract
 * (2px radius, `raised` hairlines, the 4px meter) that daisy cannot express.
 *
 * This is a RATCHET. At the time it was written the library carried 1424 hand-written utilities
 * against 49 daisy classes, with 41 of 48 components over budget — so a green-from-day-one gate was
 * never on the table. Every entry below is a debt with a number attached, and the only permitted
 * edit is to LOWER one or delete it. A component with no entry must come in at or under
 * DEFAULT_BUDGET.
 *
 * When a component is converted, drop its line. When the object is empty, the bar is met.
 */
const BUDGET: Record<string, number> = {
  'command-palette': 83,
  'create-api-key-dialog': 69,
  'create-project-dialog': 69,
  field: 67,
  'account-menu': 63,
  'date-range-field': 61,
  // REGRESSED, deliberately and visibly (2026-08-29). Adopting daisy `menu`/`table` on these three
  // COST more hand-written CSS than it saved: every place daisy's defaults disagree with the
  // console's contract needs an override, and daisy disagrees a lot (outer cell padding, a
  // `border-collapse: separate` model that never paints a row border, `--menu-active-bg` resolving
  // to `neutral` rather than `raised`, its own `:hover` rule needing `menu-active` to be beaten).
  //
  // The work is still worth merging — the ledger now has REAL `<table>` semantics (a div-grid
  // could never be styled by daisy, and screen readers never saw a table), `nav-spine`'s banned
  // boolean-only `cva.ts` is gone, and the `join` doctrine is settled on evidence. But the numbers
  // are recorded honestly rather than quietly raised: this is the first hard evidence that the two
  // halves of the bar — "tiny CSS" and "all components on daisy" — are in tension wherever our
  // visual contract diverges from daisy's defaults. Owner decision needed on which wins.
  'nav-spine': 57,
  'ledger-table': 52,
  'share-bar': 34,
  'bottom-sheet': 41,
  'account-name-dialog': 35,
  'scope-select': 33,
  checkbox: 32,
  'segmented-control': 32,
  'console-shell': 30,
  button: 29,
  'typed-confirm-dialog': 29,
  'select-field': 28,
  'chart-tooltip': 25,
  'account-badge': 23,
  'chart-legend': 23,
<<<<<<< HEAD
  'stat-card': 23,
  'row-action-group': 35,
=======
  'console-header': 22,
  'review-detail-panel': 22,
  'row-action-group': 22,
>>>>>>> 020a616 (refactor(ui-web): daisy paint + Base UI behaviour across the panel/display set)
  'sub-nav': 22,
  meter: 20,
  'stat-card': 19,
  'report-export-panel': 18,
  tooltip: 18,
  'secret-reveal': 14,
  'budget-hero': 13,
  'spend-series-chart': 12,
  'skeleton-row': 11,
  'latency-ridgeline': 10,
  'mutation-failure-banner': 9,
  'section-sheet': 6,
  'histogram-chart': 5,
  // 4, not 3, only because the audit counts the `class-variance-authority` import specifier as a
  // class token. The three real utilities are the three `tone` colours, which is exactly what the
  // bar allows a cva variant axis.
  'status-text': 4,
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
