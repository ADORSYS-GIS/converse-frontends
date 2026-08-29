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
  'button', // Base UI ships `button`; ours is daisy classes on a forwardRef
  'row-action-group', // hand-draws a rotated <span> hairline instead of `separator`
  'secret-reveal', // raw <input> + a class string instead of `input`
  'console-header', // a flex row instead of `toolbar`
  'nav-spine', // link/button rows instead of `navigation-menu`
  'sub-nav', // same
  // The three below wrap vaul. Base UI 1.7.0 now ships `drawer`; ADR 0010 rejected it as
  // "phase 5, not authorized" when it did not exist. That rejection is stale for the same reason
  // the button claim was — it needs re-taking on current facts, not leaving to drift.
  'bottom-sheet',
  'section-sheet',
  'selection-sheet',
]);

const rows: AdoptionRow[] = auditAdoption(join(import.meta.dirname, 'components'));

describe('Base UI adoption', () => {
  it.each(rows)('$component delegates behaviour to Base UI or is legitimately bespoke', (row) => {
    if (KNOWN_GAPS.has(row.component)) return;
    expect(
      row.verdict,
      `${row.component} should be built on @base-ui/react/${row.expected} but imports ` +
        `${row.imports.length ? row.imports.join(', ') : 'no Base UI at all'}.`,
    ).toBe('ok');
  });

  it('never lets a closed gap reopen', () => {
    const open = rows.filter((r) => r.verdict === 'gap').map((r) => r.component);
    for (const closed of open) {
      expect(KNOWN_GAPS.has(closed), `${closed} regressed: it is a gap but not in KNOWN_GAPS`).toBe(
        true,
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
