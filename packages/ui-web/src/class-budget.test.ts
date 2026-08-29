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
  // Where the second sweep landed: 651 hand-written utilities -> 307, and 12 of 39 components with
  // any classes at all now sit at or under DEFAULT_BUDGET with no entry here. 307 -> 305 with the
  // vaul -> Base UI drawer swap (2026-08-29): `console-shell` 13 -> 12 and `section-sheet` 6 -> 5,
  // because the tier class now goes on ONE element (the portal) instead of two (backdrop, panel).
  // `bottom-sheet` holds at 9 — it pays +1 for a `sheet-handle` class it did not need while vaul
  // shipped a handle part, and takes -1 back on comment prose.
  //
  // THE THREE REGRESSIONS ARE UNDONE, and by the mechanism the last note said was untried rather
  // than by reverting daisy: `nav-spine` 82 -> 28, `ledger-table` 65 -> 21, `row-action-group`
  // 35 -> 8. Adopting a daisy class where the console's contract diverges from daisy's default
  // costs an override PER DISAGREEMENT — but only if the override is written at the call site.
  // Written once in `theme.css`, against daisy's own class, it costs nothing here, because an
  // `@utility` lands unlayered inside `utilities` while daisy emits into a sublayer of it. That is
  // also what let `sub-nav` (22 -> 9) drop all five of its `!important`s: verified live in
  // Storybook, hovering an inactive row still paints `chrome` with daisy's own `menu` hover rule
  // in play and no `!` anywhere.
  //
  // `theme.css` now has two halves. The first CORRECTS a daisy class (18 blocks); the second
  // DECLARES one for a part the console owns outright and daisy has no vocabulary for — `rail-row`
  // (shared byte-for-byte by NavSpine and SubNav), `series-row` (shared by ChartLegend and
  // ShareBar), `console-table`, `row-action-group`, `focus-ring`, `sheet-panel`.
  //
  // HONESTY NOTE, because the numbers below are not all CSS. Of the 307 counted:
  //   * 87 are COMMENT PROSE or import specifiers. The counter tokenises any backtick-quoted
  //     hyphenated word, so `aria-labelledby`, `authz.cstack:1146-1151` and
  //     `class-variance-authority` all read as classes. Worst offenders, prose/total: `meter` 8/10,
  //     `tooltip` 6/8, `nav-spine` 12/28, `ledger-table` 12/21, `review-detail-panel` 8/18,
  //     `section-sheet` 4/6, `theme-toggle` 3/3, `chart-axis` 1/1, `selection-sheet` 1/1. Not one
  //     comment was deleted to move a number.
  //   * 4 are REAL daisyUI classes the `DAISY` set in `scripts/class-budget.ts` is missing —
  //     `menu-active`, `menu-horizontal`, `kbd-sm` (checked against
  //     `daisyui@5.7.22/components/*.css`; `menu.css` also ships `menu-dropdown`, `menu-focus`,
  //     `menu-disabled`, `menu-vertical` and four more sizes). Left uncorrected here on purpose:
  //     editing the vocabulary mid-sweep would move every number retroactively and make the
  //     651 -> 307 comparison meaningless. It is an owner call, worth about 4.
  //   * The remaining 216 are genuine hand-written utilities.
  //
  // Still irreducible, with the clause that requires it:
  //   * `md:hidden`/`lg:hidden` (console-shell 4, section-sheet 3, section-sheet-trigger 2) — ADR
  //     0009 Decision 6's tier ladder is CSS-driven, never a JS `tier` prop, so the breakpoint
  //     variant IS the component's contract. It cannot move into a class without inventing a
  //     second name for `md`.
  //   * The chart primitives (spend-series-chart, latency-ridgeline, histogram-chart) — SVG text
  //     and `<foreignObject>` styling that no class layer reaches.
  //   * Single-axis variant maps (`status-text` 3, `row-action-group`'s emphasis 3, `stat-card`'s
  //     delta tone 3) — exactly the "cva adds max 2 per variant" allowance, one token per branch.
  // ROUND 3, THE CHROME SET (2026-08-30): 303 -> 258 across the library, all of it in the shell,
  // rails and chrome. Where the bulk actually was, having dumped the counted tokens per component
  // first rather than guessing:
  //
  //  1. ONE WALL. `MutationFailureBanner` was nine utilities on a single line (9 -> 2, entry
  //     deleted). It is now `chrome-band`, and the clause that forced the move is `md:px-6`: the
  //     gutters TRACK `lib/shell-grid.ts`'s centre column, so a breakpoint variant written per
  //     banner is a second, driftable copy of the shell's own gutter. The media query is
  //     `@media (width >= theme(--breakpoint-md))`, verified against real computed padding at
  //     439px (16px) and 900px (24px) rather than assumed to compile.
  //  2. ONE CONTRACT SPELLED TWICE. `LedgerTable`'s `<tr>` and `SkeletonRow`'s placeholder both
  //     hard-coded `h-11`/`h-[52px]`, and both spelled the skeleton block — while `LedgerTable`
  //     already reached into `../skeleton-row/cva` for the widths beside it. Now `lib/row-density.ts`
  //     and `lib/skeleton-geometry.ts`. A loading state that drifts from its loaded state is
  //     invisible in review: both screenshots look plausible on their own.
  //  3. ONE PART UNDER TWO NAMES, THREE TIMES. `nav-dock` sat on the `<ul>`, leaving the root to
  //     carry `h-full w-full` purely so that `100%` had something to resolve against, and every
  //     `<li>` to carry `flex-1`; it now names the whole part from the root down. Same shape for
  //     `account-chip` (was `identity-row account-chip` at both call sites) and for
  //     `rail-panel-stack` (was `rail-stack` + `h-full gap-5`, with the `mt-auto` pin written on
  //     the actions block as though it were a property of THAT block rather than of being last).
  //  4. TWO CORRECTIONS WRITTEN AT THE CALL SITE. `CommandPaletteTrigger`'s `text-subtle!
  //     text-[11px]!` — the `!` being the tell that they were fighting `btn` from inside the same
  //     layer — are `palette-trigger` now, and win with no `!` at all.
  //
  // AND ONE UTILITY THAT WAS NEVER LOAD-BEARING. Both rails carried daisy's `menu-active` on the
  // active row, documented here and in two tests as excluding it from daisy's row-hover rule. That
  // is a specificity argument, and the two rules never meet on specificity — daisy emits into a
  // sublayer of `utilities`, an `@utility` lands unlayered inside it, unlayered wins outright.
  // Removed and measured in Storybook, not reasoned about: the hovered active row still computes
  // `--color-raised`/`--color-ink`, a hovered inactive row `--color-neutral`. Read from
  // `daisyui@5.7.22/components/menu.css`, the rest of what the class contributed was
  // `--menu-active-bg`/`-fg` paint `rail-row` already overrode, plus a depth shadow both themes
  // zero through `--depth: 0`.
  //
  // A REAL DEFECT FELL OUT OF ONE OF THESE. `NavSpine`'s list said `w-auto` and `SubNav`'s said
  // `w-full`, both over the same `-mx-2` bleed. `NavSpine`'s own comment derived why `auto` is
  // correct — `width: 100%` resolves against the containing block and is THEN shifted left by the
  // bleed, so the fill lands flush at the left and 8px short at the right. `SubNav` had exactly
  // that bug. Stating the width once in `rail-list` fixed it and removed a utility from each:
  // both lists now measure 24 -> 216 against a 32 -> 208 content box, and both label columns land
  // at x=60, i.e. the one shared `RAIL_LABEL_X` of 44 from the rail's true left edge.
  //
  // REFUSED, and worth recording so it is not retried as an oversight: folding `focus-ring` into
  // `rail-row` and into `account-chip`. It is two tokens, and both call sites always pair the two
  // classes — but this file's own rule is that these blocks are plain CSS, never `@apply`, so
  // composing them means RETYPING the ring's two shadows in a second and third place. `focus-ring`
  // exists precisely because four components had re-typed that ring and already drifted (one
  // shipped it with no gap at all). Two tokens is not worth reintroducing that.
  //
  // HONESTY NOTE for the thirteen components in this round, prose/total, measured by attributing
  // each counted token to a comment range rather than by eye: `ledger-table` 11/18,
  // `review-detail-panel` 8/14, `nav-spine` 7/15, `section-sheet` 4/5, `account-badge` 2/6,
  // `bottom-sheet` 2/8, `skeleton-row` 2/4, `sub-nav` 2/7, `account-menu`/`command-palette`/
  // `console-shell`/`mutation-failure-banner` 1 each, `console-header` 0. That is 42 of the 109
  // these thirteen still carry. Of the remaining 67, four more are not CSS either: the
  // `class-variance-authority` import specifier in two `cva.ts` files, and the `bottom-bar` PROP
  // VALUE in `nav-spine`/`console-shell`, which the tokeniser cannot tell from a class. So 63 are
  // genuine. No comment was deleted to move a number; where a count did not move (`ledger-table`
  // 21 -> 18 held back by three new prose tokens) the fix was to stop RESTATING a module path the
  // import statement three lines up already gives, never to remove an explanation.
  //
  // 28 -> 26 with the Base UI `navigation-menu` adoption (2026-08-30). Not one CSS class moved:
  // the drop is `aria-current`/`data-active` bookkeeping that the primitive now owns, plus naming
  // the import specifier (`@base-ui/react/navigation-menu`) in prose where the bare subpath used
  // to sit — which the counter read as a class and which is the more precise reference anyway.
  // `sub-nav` (9) and `console-header` (7) held flat through the same pass.
  'ledger-table': 18,
  'share-bar': 16,
  'nav-spine': 15,
  'date-range-field': 14,
  'review-detail-panel': 14,
  'console-shell': 12,
  'spend-series-chart': 12,
  'budget-hero': 11,
  'latency-ridgeline': 10,
  meter: 10,
  'stat-card': 10,
  'bottom-sheet': 8,
  'chart-legend': 8,
  'row-action-group': 8,
  tooltip: 8,
  'sub-nav': 7,
  'account-badge': 6,
  'account-menu': 6,
  'command-palette': 6,
  'console-header': 6,
  'section-sheet': 5,
  checkbox: 5,
  'histogram-chart': 5,
  'chart-tooltip': 4,
  'skeleton-row': 4,
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
