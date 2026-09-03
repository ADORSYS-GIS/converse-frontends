import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { auditAdoption } from '../scripts/base-ui-adoption';
import type { AdoptionRow } from '../scripts/base-ui-adoption';

/**
 * "All components use daisyUI x Base UI" — the owner's bar, and the half I got wrong.
 *
 * On 2026-08-29 the owner opened `components/button`, found no Base UI in it, and called out that
 * I had been claiming near-complete adoption. They were right: Base UI 1.7.0 ships `button`, ours
 * imports none, and the same is true of eight other components. The claim survived because the
 * only meter in the repo was `class-budget`, which measures daisyUI PAINT — a component can score
 * a perfect 0 utilities while delegating no behaviour at all, which is exactly what `button` did.
 *
 * So: two axes, two meters. `EXPECTED` in the script is the claim under test, and every `null`
 * there carries the reason Base UI genuinely ships nothing — an unexamined `null` is how the
 * button gap survived in the first place.
 *
 * KNOWN_GAPS is a ratchet. Entries may only be REMOVED. When it is empty, this half of the bar is
 * met, and no summary may claim otherwise before then.
 */
const KNOWN_GAPS = new Set([
  // `button` and `secret-reveal` were removed on 2026-08-29 when they were actually converted:
  // Button is Base UI's `button` element wearing the daisy classes, and SecretReveal's control is
  // Base UI's `input` inside a Field.Root, which is what finally associates the "shown once"
  // caption with the secret. Neither may come back without this file failing.
  //
  // `row-action-group` STAYS, and its reason is rewritten rather than repeated. It is not an
  // unexamined gap: Base UI 1.7.0's `separator` was read in full and REFUSED, because its entire
  // contribution is the announced `role="separator"`, this component renders once per ledger ROW,
  // and 1.7.0 ships no decorative flag (its only own prop is `orientation`) to keep it quiet.
  // Adopting it would put roughly a hundred announced separators into a fifty-key ledger to
  // describe a 1px decorative tick, and the only way to silence that — `aria-hidden` — cancels the
  // primitive's one contribution while still costing a DOM node per action. The refusal is pinned
  // by `components/row-action-group/component.test.tsx`, which asserts the hairline costs no node
  // and announces no separator role. Close this entry only by deleting the decoration or by Base
  // UI shipping a decorative separator — never by adopting it as ceremony.
  'row-action-group',
  // `nav-spine` and `sub-nav` CLOSED 2026-08-30: both build on `navigation-menu`'s
  // `Root`/`List`/`Item`/`Link` (the popup half is optional and omitted), so `active` ->
  // `aria-current="page"` comes from the primitive, and the rows gained orientation-aware arrow
  // navigation. `NavigationMenuLink` merges `tabIndex: undefined` OVER `CompositeItem`'s roving
  // `-1`, so the composite root does NOT collapse the rows to a single tab stop — that prop-merge
  // order is invisible from the hook and is the only reason this was adoptable.
  //
  // `console-header` left by REFUSAL, not adoption, so it is `EXPECTED: null` with its reason
  // rather than a debt entry here — a debt entry would imply we still mean to adopt `toolbar`.
  // `bottom-sheet`/`section-sheet`/`selection-sheet` were here while they wrapped vaul. Closed
  // 2026-08-29: `bottom-sheet` is Base UI's `drawer`, and the other two compose it.
]);

const rows: AdoptionRow[] = auditAdoption(join(import.meta.dirname, 'components'));

describe('Base UI adoption', () => {
  it.each(rows)('$component delegates behaviour to Base UI or is legitimately bespoke', (row) => {
    if (KNOWN_GAPS.has(row.component)) return;
    expect(
      row.verdict,
      `${row.component} should be built on @base-ui/react/${row.expected} but imports ` +
        `${row.imports.length ? row.imports.join(', ') : 'no Base UI at all'}.`
    ).toBe('ok');
  });

  it('never lets a closed gap reopen', () => {
    const open = rows.filter((r) => r.verdict === 'gap').map((r) => r.component);
    for (const closed of open) {
      expect(KNOWN_GAPS.has(closed), `${closed} regressed: it is a gap but not in KNOWN_GAPS`).toBe(
        true
      );
    }
  });

  it('keeps KNOWN_GAPS honest — an entry that is no longer a gap must be deleted', () => {
    const open = new Set(rows.filter((r) => r.verdict === 'gap').map((r) => r.component));
    for (const stale of KNOWN_GAPS) {
      expect(open.has(stale), `${stale} is fixed; remove it from KNOWN_GAPS`).toBe(true);
    }
  });
});
