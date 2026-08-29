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
  // 1424 at the start of this sweep, 249 now; 22 of 49 components carry no entry at all.
  //
  // HONESTY NOTE — the counter over-reports, and the remaining numbers are mostly not CSS:
  //  - it tokenises backtick-quoted hyphenated words in comments, so `aria-labelledby` and file
  //    paths read as classes (`meter` is 8 of 10 prose; `tooltip` 6 of 8 with ZERO raw Tailwind);
  //  - it counts a `theme.css` `@utility` name — the sanctioned destination — once per use site;
  //  - it counts occurrences, not distinct classes;
  //  - it counts each `'class-variance-authority'` import specifier.
  // No comment has been deleted to move a number. Extending the script's vocabulary would drop
  // these a lot further but would retroactively invalidate every historical figure, so it has been
  // left alone deliberately.
  'nav-spine': 26,
  'ledger-table': 21,
  'review-detail-panel': 18,
  'console-shell': 12,
  'account-menu': 11,
  'skeleton-row': 11,
  meter: 10,
  'stat-card': 10,
  'account-badge': 9,
  'bottom-sheet': 9,
  'mutation-failure-banner': 9,
  'sub-nav': 9,
  tooltip: 8,
  'command-palette': 7,
  'console-header': 7,
  'row-action-group': 7,
  checkbox: 5,
  'date-range-field': 5,
  'section-sheet': 5,
  'budget-hero': 4,
  'share-bar': 4,
  'spend-series-chart': 4,
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
