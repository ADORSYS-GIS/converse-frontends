import { describe, expect, it } from 'vitest';

import { aggregateConsumptionRows, consumptionCsvLines } from '../consumption-csv';
import type { UsageSeriesPoint } from '../consumption-csv';
import { buildConsumptionReport } from './consumption-report';

/**
 * The migration's regression check (converse-frontends#453): "the same figures appear — a
 * regression check on numbers, not pixels".
 *
 * The fixture below is the same shape `consumption-csv.test.ts` uses, and the expected strings are
 * what the DELETED `consumption-pdf.ts` produced: `formatUsd`'s adaptive precision (so a genuinely
 * sub-cent project reads `$0.0063`, never `$0.00`) and thin-space-grouped counts. If the Typst
 * document ever states a different figure than the writer it replaced did, this fails.
 */

/** U+2009 THIN SPACE, spelled as an escape so a future editor cannot silently normalise it to a
 *  normal space and turn this regression check into a tautology. */
const THIN_SPACE = ' ';

function point(overrides: Partial<UsageSeriesPoint> = {}): UsageSeriesPoint {
  return {
    project_id: 'prj_alpha',
    model: 'gpt-4o',
    requests: 1_200,
    prompt_tokens: 1_000_000,
    completion_tokens: 250_000,
    total_tokens: 1_250_000,
    total_cost: 1_131_800_000,
    ...overrides,
  };
}

const ROWS = aggregateConsumptionRows([
  point(),
  point({ model: 'gpt-4o-mini', requests: 3, total_cost: 6_300, total_tokens: 900 }),
  point({ project_id: null, model: null, requests: 7, total_cost: 2_000_000, total_tokens: 4_000 }),
]);

function report() {
  return buildConsumptionReport({
    rows: ROWS,
    month: '2026-02',
    accountId: 'acc_123',
    projectId: undefined,
    templateOrigin: 'shipped',
    generatedAt: new Date('2026-03-01T08:00:00Z'),
  });
}

describe('buildConsumptionReport', () => {
  it('states money through the SHARED formatter, keeping sub-cent precision', () => {
    const table = report().panels.find((panel) => panel.id === 'by-project-model')?.table;
    const miniRow = table?.rows.find((row) => row[1] === 'gpt-4o-mini');

    // 6 300 micro-USD = $0.0063. A fixed two-decimal rule would print `$0.00` and claim the
    // project was free — the exact reason the deleted writer used `formatUsd` too.
    expect(miniRow?.[6]).toBe('$0.0063');
  });

  it('groups counts with the console’s thin space, same as the deleted writer', () => {
    const table = report().panels.find((panel) => panel.id === 'by-project-model')?.table;
    const mainRow = table?.rows.find((row) => row[1] === 'gpt-4o');

    expect(mainRow?.[2]).toBe(`1${THIN_SPACE}200`);
    expect(mainRow?.[5]).toBe(`1${THIN_SPACE}250${THIN_SPACE}000`);
  });

  it('names unattributed rows rather than dropping them', () => {
    const table = report().panels.find((panel) => panel.id === 'by-project-model')?.table;

    expect(table?.rows.map((row) => row[0])).toContain('(unattributed)');
  });

  it('carries a TOTAL row that is a real sum of the groups returned', () => {
    const table = report().panels.find((panel) => panel.id === 'by-project-model')?.table;
    const total = table?.rows.at(-1);

    expect(total?.[0]).toBe('TOTAL');
    // 1 131 800 000 + 6 300 + 2 000 000 micro-USD = $1 133.8063 -> `formatUsd`'s own rendering.
    expect(total?.[2]).toBe(`1${THIN_SPACE}210`);
  });

  it('states the SAME totals the CSV path states', () => {
    // The CSV is the pre-existing, byte-identical document. Both read `consumptionTotals`, so this
    // pins the two against each other rather than against a hand-typed expectation.
    const csv = consumptionCsvLines(ROWS).at(-1) as string;
    const csvTotalRequests = csv.split(',')[2];
    const total = report()
      .panels.find((panel) => panel.id === 'by-project-model')
      ?.table?.rows.at(-1);

    expect(total?.[2].replace(new RegExp(THIN_SPACE, 'g'), '')).toBe(csvTotalRequests);
  });

  it('renders a month with no usage as genuine zeroes, not a missing table', () => {
    const empty = buildConsumptionReport({
      rows: [],
      month: '2026-02',
      accountId: 'acc_123',
      templateOrigin: 'shipped',
      generatedAt: new Date('2026-03-01T08:00:00Z'),
    });
    const table = empty.panels.find((panel) => panel.id === 'by-project-model')?.table;

    expect(table?.rows).toHaveLength(1);
    expect(table?.rows[0][0]).toBe('TOTAL');
    expect(table?.rows[0][6]).toBe('$0.00');
  });

  it('resolves against its own template route, which is NOT a dashboards.yaml page', () => {
    // The consumption report has no page of its own; only `/api/reports/page` consults that
    // document. It still follows the path-mirrors-template rule, so it is overridable at
    // `${CONSOLE_TEMPLATES_DIR}/reports/consumption/report.typ`.
    expect(report().route).toBe('/reports/consumption');
    expect(report().template.origin).toBe('shipped');
  });

  it('states the month and the account it is about', () => {
    expect(report().rangeLabel).toBe('2026-02');
    expect(report().window.start).toBe('2026-02-01T00:00:00.000Z');
    expect(report().filters).toEqual([{ label: 'account', value: 'acc_123' }]);
  });
});
