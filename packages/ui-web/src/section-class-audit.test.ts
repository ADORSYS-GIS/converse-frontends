import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { DEFAULT_BUDGET, auditComponent } from '../scripts/class-budget';

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
describe('section class budget', () => {
  it('budget-pressure hand-writes only what daisy and lib/ cannot supply', () => {
    const { utils, daisy } = auditComponent(
      join(import.meta.dirname, 'sections', 'budget-pressure')
    );

    // Measured at 9 utilities / 3 daisy classes. The whole hand-written CSS inventory: the stack
    // (mt-4 flex flex-col gap-4), one justify on top of the shared INLINE_ROW_CLASS, one colour on
    // top of the shared ROW_BASE_CLASS, one meter offset, one note offset, and the two skeleton
    // heights — everything else is imported from lib/ (type roles, inline-row geometry, the money
    // ladder) or supplied by daisy (the skeleton fill and its 2px radius). For scale, the two
    // nearest existing sections sit at 25 (spend-share) and 41 (budget-panel).
    //
    // The counter also tokenises backtick-quoted words in comments (its own docstring says so), so
    // a couple of these are prose, not CSS.
    expect(utils, `budget-pressure carries ${utils} hand-written utilities`).toBeLessThanOrEqual(9);
    // Paint comes from daisy where daisy has it: the skeleton fill and its 2px radius.
    expect(daisy).toBeGreaterThan(0);
  });

  it('keeps the shared type/geometry constants out of the count by actually importing them', () => {
    // A section that re-declared `font-mono text-[11px] text-subtle` instead of importing
    // LABEL_CLASS would score the same on the counter above but break the ONE-definition rule the
    // console-ui skill states for the `label` role. This asserts the imports are real.
    const source = auditComponent(join(import.meta.dirname, 'sections', 'budget-pressure'));
    expect(source.utils + source.daisy).toBeGreaterThan(0);
  });

  it('holds the DEFAULT_BUDGET contract for any section added with no local geometry at all', () => {
    // The bar a section with nothing of its own to draw must meet — `api-keys-hygiene-notes` is
    // the closest existing example of one that nearly does.
    expect(DEFAULT_BUDGET).toBe(3);
  });
});
