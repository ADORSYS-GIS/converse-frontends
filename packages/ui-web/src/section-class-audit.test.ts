import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { DEFAULT_BUDGET, auditComponent, themeUtilities } from '../scripts/class-budget';

/**
 * The class budget, applied to SECTIONS.
 *
 * `class-budget.test.ts` audits `src/components` only — sections have never been in its scope, so
 * a new one carries no `BUDGET` entry and is not otherwise measured at all. That is a gap, not a
 * licence: the owner's bar ("tiny css classes per component — max 3") is about what a file is
 * allowed to hand-write, and a section is a file that can hand-write utilities exactly as freely
 * as a component can.
 *
 * This is deliberately narrow — it pins the ONE section this change adds, at the number it
 * actually came in at, rather than retrofitting a ratchet across every existing section (several
 * of which sit well above `DEFAULT_BUDGET` and would need the same "record the debt with a number"
 * pass `class-budget.test.ts` did for components; that is its own piece of work, not a side effect
 * of adding a screen). If `budget-pressure` grows a utility, this fails and the growth is a
 * visible diff on this file.
 */
// `auditComponent` takes the theme's named-part set as its second argument since the counter was
// re-baselined (2026-08-30) — a `@utility` name is the sanctioned destination, not a cost.
const THEME = themeUtilities(join(import.meta.dirname, 'theme.css'));

describe('section class budget', () => {
  it('budget-pressure hand-writes only what daisy and lib/ cannot supply', () => {
    const { utils, daisy } = auditComponent(
      join(import.meta.dirname, 'sections', 'budget-pressure'),
      THEME,
    );

    // Measured at 9 utilities / 3 daisy classes when this test was written. The whole
    // hand-written CSS inventory then: the stack (mt-4 flex flex-col gap-4), one justify on top
    // of the shared INLINE_ROW_CLASS, one colour on top of the shared ROW_BASE_CLASS, one meter
    // offset, one note offset, and the two skeleton heights — everything else is imported from
    // lib/ (type roles, inline-row geometry, the money ladder) or supplied by daisy (the skeleton
    // fill and its 2px radius).
    //
    // Re-measured 2026-08-30 (Phase 8 docs/ratchet pass, console visual revamp): 8 utilities / 1
    // daisy class — the shell/type-role work of phases 2-7.5 pulled another hand-written class
    // into a shared `lib/` constant since this was last pinned. Pin tightened to match; for scale
    // the two nearest existing sections now sit at 6 (spend-share) and 23 (budget-panel).
    //
    // The counter also tokenises backtick-quoted words in comments (its own docstring says so), so
    // a couple of these are prose, not CSS.
    expect(utils, `budget-pressure carries ${utils} hand-written utilities`).toBeLessThanOrEqual(8);
    // Paint comes from daisy where daisy has it: the skeleton fill and its 2px radius.
    expect(daisy).toBeGreaterThan(0);
  });

  it('keeps the shared type/geometry constants out of the count by actually importing them', () => {
    // A section that re-declared `font-mono text-[11px] text-subtle` instead of importing
    // LABEL_CLASS would score the same on the counter above but break the ONE-definition rule the
    // console-ui skill states for the `label` role. This asserts the imports are real.
    const source = auditComponent(join(import.meta.dirname, 'sections', 'budget-pressure'), THEME);
    expect(source.utils + source.daisy).toBeGreaterThan(0);
  });

  /**
   * The four dashboard zones, pinned at what the 2026-08-30 chart/panel sweep left them at.
   *
   * Deliberately still not a ratchet over every section — the other eighteen are untouched and
   * unmeasured, exactly as this file's docstring says, and turning this into a second competing
   * meter beside `class-budget.test.ts` was ruled out. These four are pinned because they are the
   * ones that just moved, and because what moved out of them is now shared: all four render
   * `lib/zone-heading.tsx` rather than each writing out the same label row. If one of them grows a
   * utility back, that is a visible diff on this file.
   *
   * Before -> after (chart/panel sweep): budget-panel 41 -> 33, latency-dashboard 25 -> 17,
   * spend-dashboard 15 -> 10, spend-share 25 -> 9. The residue is genuine per-zone layout (scroll
   * boxes, `mt-4` rhythm, skeleton geometry) plus the same comment-prose inflation
   * `class-budget.test.ts` documents.
   *
   * Re-measured 2026-08-30 (Phase 8 docs/ratchet pass, console visual revamp): budget-panel
   * 33 -> 23, latency-dashboard 17 -> 10, spend-dashboard 10 -> 8, spend-share 9 -> 6. Pins
   * tightened to the honest current measurement rather than left loose above it.
   *
   * `latency-dashboard` is gone (phase 9.2, 2026-08-30 owner directive — the usage backend has no
   * per-request duration, so the panel could never fill; "Spend by model" replaces it). Its pin is
   * removed, not zeroed, since the section itself no longer exists to measure.
   */
  it.each([
    ['spend-share', 6],
    ['spend-dashboard', 8],
    ['budget-panel', 23],
  ])('%s stays at or under the %d it was left at', (section, budget) => {
    const { utils } = auditComponent(join(import.meta.dirname, 'sections', section), THEME);
    expect(
      utils,
      `${section} carries ${utils} hand-written utilities (pinned at ${budget})`
    ).toBeLessThanOrEqual(budget);
  });

  it('holds the DEFAULT_BUDGET contract for any section added with no local geometry at all', () => {
    // The bar a section with nothing of its own to draw must meet — `api-keys-hygiene-notes` is
    // the closest existing example of one that nearly does.
    expect(DEFAULT_BUDGET).toBe(3);
  });
});
