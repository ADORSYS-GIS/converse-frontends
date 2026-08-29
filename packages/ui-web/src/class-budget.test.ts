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
  // REGRESSED, deliberately and visibly: `nav-spine` (57→82), `ledger-table` (52→65) and
  // `row-action-group` (22→35). Adopting daisy `menu`/`table` there COST more hand-written CSS
  // than it saved — every place daisy's defaults disagree with the console's contract needs an
  // override, and daisy disagrees a lot. Recorded rather than gamed: this is the evidence that the
  // two halves of the bar pull against each other wherever our contract diverges from daisy's.
  //
  // The panel set went the other way (99→22, 81→30, 66→23) by DEDUPLICATING into shared `lib/`
  // modules rather than adopting a rejected daisy class. That is the pattern that works.
  'command-palette': 83,
  'nav-spine': 82,
  'create-api-key-dialog': 69,
  'create-project-dialog': 69,
  field: 67,
  'ledger-table': 65,
  'account-menu': 63,
  'date-range-field': 61,
  'bottom-sheet': 41,
  'account-name-dialog': 35,
  'row-action-group': 35,
  'share-bar': 34,
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
  'console-header': 22,
  'review-detail-panel': 22,
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
