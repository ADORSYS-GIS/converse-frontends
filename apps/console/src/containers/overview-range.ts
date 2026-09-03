import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';

import { OVERVIEW_RANGES } from '../client/url-state';
import type { Translate } from '../i18n/config';
import { RANGE_DAYS, rangeLabels } from './overview-usage';

/**
 * The range picker's PRESET LIST, stated once (converse-frontends#455, story C12).
 *
 * Every dashboard page in this console offers the same four presets over the same
 * `resolveOverviewWindow` reconciliation, and every one of them used to redeclare this table in its
 * own container — five copies by the time C12 arrived, which is five places a day count could
 * drift from the URL contract that defines it. It is derived from `OVERVIEW_RANGES` (the parser's
 * own literal union) rather than listed beside it, so a preset the toolbar can offer but the parser
 * would reject cannot exist.
 *
 * `rangeLabels` lives in `overview-usage.ts` (C10 put it there when the export pipeline needed it
 * server-side) and is re-exported here so a container that renders the picker imports one module,
 * not two.
 *
 * ADR 0017 turns both into FUNCTIONS taking the caller's `t`: a preset's label is copy, and copy
 * cannot be a module constant once the console ships two languages — a constant is resolved at
 * import time, before any request has a locale. The `days` arithmetic and the `value` vocabulary
 * are unchanged and stay locale-independent, which is what keeps a `?range=7d` link portable
 * between readers.
 */

export type OverviewRangeValue = (typeof OVERVIEW_RANGES)[number];

/** `'mtd'` has no fixed day count — it is a calendar-month span (`DateRangePreset.days`' own doc
 *  comment, `resolveRangeWindow`'s `'mtd'` branch); every other preset keeps its rolling count. */
export function rangePresets(t: Translate): DateRangePreset[] {
  const labels = rangeLabels(t);
  return OVERVIEW_RANGES.map((value) => ({
    value,
    label: labels[value],
    days: value === 'mtd' ? 'mtd' : RANGE_DAYS[value],
  }));
}

export { rangeLabels };
