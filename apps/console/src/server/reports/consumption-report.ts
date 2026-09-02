import { formatUsd } from '@lightbridge/ui-web/src/lib/money';

import {
  consumptionTotals,
  microUsdToUsd,
  monthRange,
  type ConsumptionRow,
} from '../consumption-csv';
import type { ReportDocument } from './report-data';

/**
 * The consumption report as a `ReportDocument` — the hard cutover from the hand-rolled PDF writer
 * (converse-frontends#453).
 *
 * `src/server/pdf-document.ts` (a dependency-free PDF 1.4 writer, Standard-14 fonts only, no
 * images and no SVG) and `consumption-pdf.ts` are DELETED by this change, not left beside the new
 * path. That writer was a dead end by construction: the whole point of this story is charts in a
 * report, and it could not draw one at any price.
 *
 * What is deliberately NOT changed:
 *
 *  - **The CSV, byte for byte.** `consumption-csv.ts` still owns the project × model grouping and
 *    the `TOTAL` row, and the route still streams it line by line. Its tests are untouched.
 *  - **The FIGURES.** Money goes through the same shared `formatUsd` the deleted PDF used (its
 *    adaptive precision is why a genuinely sub-cent project reads `$0.0063` and not `$0.00`), and
 *    counts get the same thin-space grouping. A pre-migration sample and a post-migration one
 *    state the same numbers in the same strings — which is the regression the story asks for, and
 *    what `consumption-report.test.ts` pins.
 *
 * What IS new is that the document now goes through the same `_lib/report.typ` library and the
 * same override mechanism as every dashboard report. Its template is
 * `templates/reports/consumption/report.typ`, overridable at
 * `${CONSOLE_TEMPLATES_DIR}/reports/consumption/report.typ` — a route that is not in
 * `dashboards.yaml`, because this report is not a dashboard page; only `/api/reports/page`
 * consults that document.
 */

/** The template route this report resolves against. Not a browser route — the consumption report
 *  has no page of its own — but the same path-mirrors-template rule applies to it. */
export const CONSUMPTION_TEMPLATE_ROUTE = '/reports/consumption';

/** The console's thousands separator (`packages/ui-web/src/lib/money.ts`, "$1 131.80"), applied to
 *  the count columns so they read as the same ledger the money column does. Carried over verbatim
 *  from the deleted `consumption-pdf.ts` so the figures do not change shape in the migration. */
const THIN_SPACE = ' ';

export function formatConsumptionCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

/** Money through the SHARED formatter, never a local `toFixed` — the same string the console shows
 *  on screen, and the same one the deleted PDF wrote. Deliberately different from the CSV's fixed
 *  6dp `total_cost_usd`: a spreadsheet wants a stable machine scale, a person wants legibility. */
export function formatConsumptionMoney(microUsd: number): string {
  return formatUsd(microUsdToUsd(microUsd));
}

export interface ConsumptionReportInput {
  rows: readonly ConsumptionRow[];
  /** `YYYY-MM`. */
  month: string;
  accountId: string;
  projectId?: string;
  templateOrigin: string;
  generatedAt: Date;
}

const COLUMNS = [
  'Project',
  'Model',
  'Requests',
  'Prompt tokens',
  'Completion tokens',
  'Total tokens',
  'Cost (USD)',
];

export function buildConsumptionReport(input: ConsumptionReportInput): ReportDocument {
  const totals = consumptionTotals(input.rows);
  const { startTime, endTime } = monthRange(input.month);

  return {
    title: 'Consumption report',
    route: CONSUMPTION_TEMPLATE_ROUTE,
    rangeLabel: input.month,
    window: { start: startTime, end: endTime },
    generatedAt: input.generatedAt.toISOString(),
    filters: [
      { label: 'account', value: input.accountId },
      ...(input.projectId ? [{ label: 'project', value: input.projectId }] : []),
    ],
    template: { route: CONSUMPTION_TEMPLATE_ROUTE, origin: input.templateOrigin },
    // The consumption report IS its table. There is no toggle for it and never was one.
    includeTables: true,
    panels: [
      {
        id: 'totals',
        type: 'stat-group',
        title: 'Totals',
        span: 2,
        stats: [
          { label: 'Requests', value: formatConsumptionCount(totals.requests) },
          { label: 'Total tokens', value: formatConsumptionCount(totals.totalTokens) },
          { label: 'Cost', value: formatConsumptionMoney(totals.totalCostMicroUsd) },
        ],
      },
      {
        id: 'by-project-model',
        type: 'table',
        title: 'By project × model',
        span: 2,
        table: {
          columns: COLUMNS,
          rows: [
            ...input.rows.map((row) => [
              row.projectId,
              row.model,
              formatConsumptionCount(row.requests),
              formatConsumptionCount(row.promptTokens),
              formatConsumptionCount(row.completionTokens),
              formatConsumptionCount(row.totalTokens),
              formatConsumptionMoney(row.totalCostMicroUsd),
            ]),
            // The TOTAL row is a real sum over the groups actually returned, never fabricated —
            // and it is present even for a month with no usage, where every figure is a genuine
            // zero rather than a missing one.
            [
              'TOTAL',
              '',
              formatConsumptionCount(totals.requests),
              formatConsumptionCount(totals.promptTokens),
              formatConsumptionCount(totals.completionTokens),
              formatConsumptionCount(totals.totalTokens),
              formatConsumptionMoney(totals.totalCostMicroUsd),
            ],
          ],
        },
      },
    ],
  };
}
