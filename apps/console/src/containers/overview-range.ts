import type { DateRangePreset } from '@lightbridge/ui-web/src/components/date-range-field';

import { OVERVIEW_RANGES } from '../client/url-state';
import { RANGE_DAYS, RANGE_LABELS } from './overview-usage';

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
 * `RANGE_LABELS` lives in `overview-usage.ts` (C10 put it there when the export pipeline needed it
 * server-side) and is re-exported here so a container that renders the picker imports one module,
 * not two.
 */

export type OverviewRangeValue = (typeof OVERVIEW_RANGES)[number];

/** `'mtd'` has no fixed day count — it is a calendar-month span (`DateRangePreset.days`' own doc
 *  comment, `resolveRangeWindow`'s `'mtd'` branch); every other preset keeps its rolling count. */
export const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  days: value === 'mtd' ? 'mtd' : RANGE_DAYS[value],
}));

export { RANGE_LABELS };
