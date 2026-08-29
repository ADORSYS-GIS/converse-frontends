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
  // 28 -> 26 with the Base UI `navigation-menu` adoption (2026-08-30). Not one CSS class moved:
  // the drop is `aria-current`/`data-active` bookkeeping that the primitive now owns, plus naming
  // the import specifier (`@base-ui/react/navigation-menu`) in prose where the bare subpath used
  // to sit — which the counter read as a class and which is the more precise reference anyway.
  // `sub-nav` (9) and `console-header` (7) held flat through the same pass.
  //
  // ─── Round 3, the chart and panel set (2026-08-30): 303 -> 249 ────────────────────────────
  //
  // `chart-legend`, `latency-ridgeline`, `histogram-chart` and `chart-tooltip` are GONE from this
  // object — all four now come in at or under DEFAULT_BUDGET. What moved:
  //   * `lib/series-row.tsx` — `ChartLegend` and `ShareBar` render the same five-element row and
  //     each wrote it out. One module, two consumers, `theme.css`'s `series-row` unchanged.
  //   * `lib/chart-hit-region.tsx` + `@utility chart-hit-region` — the transparent per-datum
  //     `<button>` over a plot, written out identically in all THREE chart primitives.
  //   * `lib/chart-empty-message.tsx` + `@utility chart-empty-message` — the "nothing to plot"
  //     line, written out twice with its inline inset and its own eight-line note. It also
  //     carried a live BUG: `histogram-chart` was still drawing that copy as an SVG `<text>`, the
  //     exact non-wrapping element the 2026-08-29 report was about. Fixed by adopting the module.
  //   * `lib/zone-heading.tsx` + `@utility zone-heading` — the dashboard zone label row, written
  //     out byte for byte in `SpendDashboard`/`LatencyDashboard`/`BudgetPanel` and once more as a
  //     baseline variant in `SpendShareSection`. (Sections are not audited here; see below.)
  //   * `@utility share-bar` / `budget-hero` / `date-range-popup` / `date-range-presets` —
  //     component blocks for parts daisy has no vocabulary for. `date-range-field`'s preset rows
  //     dropped their selected-state ternary entirely: `data-selected` is an attribute
  //     `OVERLAY_ITEM_CLASS` already paints, and the call site was restating it.
  //   * `chart-tooltip-title` DELETED as a class — the card's rows are `<div>`s, so the title is
  //     its only direct `<span>` child, which is the same positional rule the card already used
  //     for its label and value.
  //   * `HERO_CEILING_CLASS` joined `lib/type-roles.ts` — the "of $ceiling" step beside a hero
  //     numeral, hand-typed in `BudgetHero`.
  //
  // Verified in Storybook from computed styles, `black` and `wireframe`: the rank ramp still
  // resolves per theme (dark `#b4b4b4/#7c7c7c/#565656/#3a3a3a`, light `#363636/#636363/#8b8b8b/
  // #afafaf`) and the accent appears exactly once per chart.
  //
  // WHAT THE COUNTER IS ACTUALLY COUNTING, for the six entries below that did not move. It counts
  // TOKEN OCCURRENCES in string literals, so it charges for three separate things:
  //   (a) real hand-written Tailwind — the thing the bar is about;
  //   (b) a `theme.css` `@utility` name, which is the DESTINATION of every sweep so far and which
  //       the owner's own bar names as compliant — yet still reads as one utility per use site;
  //   (c) comment prose and quoted code identifiers.
  // Of the 53 the twelve components in this round now carry, 23 are (c) and 12 are (b). The
  // counter is left alone anyway: changing its vocabulary mid-ratchet would move every number
  // retroactively and make 651 -> 307 -> 249 meaningless. It is an owner call.
  //
  // Held flat, with the clause that requires it:
  //   * `meter` 10 — 8 are prose (`aria-valuenow`, `aria-valuetext`×2, `aria-labelledby`,
  //     `aria-hidden`, `aria-label`, `data-breached`, `radial-progress`); the believed 8/10 is
  //     CONFIRMED. The real CSS is `sr-only` on Base UI's Label and the `meter-track` class.
  //     daisy `progress` stays REJECTED (rounded, animated) — the 4px square track is ours.
  //   * `tooltip` 8 — 6 prose, and the two real ones are `@utility` names (`focus-ring`,
  //     `tooltip-popup`). ZERO raw Tailwind. daisy `tooltip` is on the not-adopted list.
  //   * `checkbox` 5 — 3 are quoted destructuring KEYS (`'aria-label'`, `'aria-labelledby'`), not
  //     even prose. The 2 real ones are `CheckboxGroup`'s `flex flex-col gap-2`. daisy `fieldset`
  //     was read (`daisyui@5.7.22/components/fieldset.css`) and REFUSED: it is `display: grid`
  //     with a `.375rem` gap, so adopting it would move the group's 8px rhythm to 6px to satisfy
  //     a counter.
  //   * `status-text` 4 — 1 is the `class-variance-authority` import specifier; the other 3 are
  //     the `tone` colours, exactly the "cva adds max 2 per variant" allowance.
  //   * `share-bar` 4 / `spend-series-chart` 4 / `budget-hero` 4 — each is 1 over, and each is
  //     over by prose or by an `@utility` name: `share-bar` has 3 class names + `aria-hidden`;
  //     `spend-series-chart` has 3 prose (`d3-shape`, `react-native-svg`,
  //     `chart-tokens.specSeriesColor`) + one real `mt-2`; `budget-hero` has 2 class names + 2
  //     prose. `date-range-field` 5 is `en-GB` (a LOCALE, read as a class), `data-selected`
  //     (prose), 2 block names and one real `text-primary`.
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
  'row-action-group': 8,
  tooltip: 8,
  'command-palette': 7,
  'console-header': 7,
  'section-sheet': 5,
  checkbox: 5,
  'date-range-field': 5,
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
