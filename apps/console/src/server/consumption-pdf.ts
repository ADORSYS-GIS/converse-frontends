import { formatUsd } from '@lightbridge/ui-web/src/lib/money';

import { consumptionTotals, microUsdToUsd, type ConsumptionRow } from './consumption-csv';
import { A4, monoWidth, renderPdfDocument, type PdfOp, type PdfPageSize } from './pdf-document';

/**
 * The PDF half of `/api/reports/consumption?format=pdf` — the SAME consumption report the CSV
 * path emits, set as a document a person can read rather than a spreadsheet a machine can parse.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY SERVER-SIDE
 * ---------------------------------------------------------------------------------------------
 * The report is rendered in the route handler, not in the browser, for three reasons that all
 * point the same way:
 *
 * 1. **The data never legitimately reaches the client in this shape.** ADR 0009 Decision 3 puts
 *    the usage backend behind the console: `/usage/v1/usage/query` is called with the session's
 *    access token over an mTLS dispatcher (`usage-dispatcher.ts`) and is never exposed to the
 *    browser. A client-side renderer would mean shipping the raw per-(project, model) series to
 *    the page purely so it could be re-serialised there — a second, wider data path for no gain.
 * 2. **One report, one grouping.** `aggregateConsumptionRows`/`consumptionTotals` already own the
 *    project × model grouping and the TOTAL row for the CSV. Both formats call them here, in one
 *    process, so the two documents cannot drift. Two report generators that group differently is
 *    a bug waiting to happen.
 * 3. **Zero client bundle cost.** This module and `pdf-document.ts` live under `src/server/` and
 *    are imported only by a `runtime = 'nodejs'` route, so nothing here reaches the browser
 *    bundle — see `pdf-document.ts`'s header for why a browser-first PDF library was rejected on
 *    exactly this ground.
 *
 * It also means the existing route grows a `format` parameter rather than the app growing a
 * second route: everything before the final `NextResponse` — month validation, scope, session
 * refresh, the upstream query, the aggregation — is identical for both formats. A second route
 * would be a copy of ~120 lines of session handling whose only difference is the last header.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY IT LOOKS THE WAY IT DOES
 * ---------------------------------------------------------------------------------------------
 * `docs/design/console-redesign/README.md` §2.2: "Numeric columns are right-aligned; the mono
 * family makes the digits line up as a ledger. Thousands use a thin space." That contract carries
 * over intact — Courier stands in for IBM Plex Mono (a Standard-14 face, so nothing has to be
 * embedded), numerics are right-aligned, and thousands are grouped with a thin space.
 *
 * What does NOT carry over is the console's near-black surface stack (ADR 0008). This is a
 * document that gets printed and sent to whoever pays the bill; ink on paper is black on white.
 * Greyscale only — the `--signal` accent has no job in a static report.
 */

// ── Layout ───────────────────────────────────────────────────────────────────────────────────

const PAGE: PdfPageSize = A4;
const MARGIN_X = 48;
const MARGIN_TOP = 56;
const FOOTER_BASELINE = 36;
const CONTENT_WIDTH = PAGE.width - MARGIN_X * 2;

const BODY_SIZE = 8;
const HEADER_SIZE = 7;
const ROW_HEIGHT = 13;

/**
 * The ledger grid, in CHARACTERS rather than points. Courier's advance is exactly 0.6em for every
 * glyph (`pdf-document.ts`), so a column measured in characters needs no font-metric lookup and
 * cannot overflow by a fraction of a glyph. 98 characters plus one blank between each pair of
 * columns is 104, and 104 × 8pt × 0.6 = 499.2pt — the full A4 text measure, with 0.08pt to spare.
 */
const COLUMNS = [
  { key: 'project', header: 'PROJECT', chars: 18, align: 'left' },
  { key: 'model', header: 'MODEL', chars: 17, align: 'left' },
  { key: 'requests', header: 'REQUESTS', chars: 10, align: 'right' },
  { key: 'prompt', header: 'PROMPT TOK', chars: 12, align: 'right' },
  { key: 'completion', header: 'COMPLETION', chars: 12, align: 'right' },
  { key: 'tokens', header: 'TOTAL TOKENS', chars: 14, align: 'right' },
  { key: 'cost', header: 'COST (USD)', chars: 15, align: 'right' },
] as const satisfies readonly {
  key: string;
  header: string;
  chars: number;
  align: 'left' | 'right';
}[];

type ColumnKey = (typeof COLUMNS)[number]['key'];
type Cells = Record<ColumnKey, string>;

/** Left and right edge of each column, in points, derived once from the character grid. */
const COLUMN_BOUNDS: Record<ColumnKey, { left: number; right: number }> = (() => {
  const bounds = {} as Record<ColumnKey, { left: number; right: number }>;
  let charOffset = 0;
  for (const column of COLUMNS) {
    const left = MARGIN_X + monoWidth(charOffset, BODY_SIZE);
    bounds[column.key] = { left, right: left + monoWidth(column.chars, BODY_SIZE) };
    charOffset += column.chars + 1;
  }
  return bounds;
})();

const COLUMN_CHARS: Record<ColumnKey, number> = Object.fromEntries(
  COLUMNS.map((column) => [column.key, column.chars])
) as Record<ColumnKey, number>;

// ── Cell formatting ──────────────────────────────────────────────────────────────────────────

/** The console's thousands separator — `packages/ui-web/src/lib/money.ts`, "$1 131.80". WinAnsi
 *  has no thin space and downgrades it to a normal one on the way into the PDF; the grouping is
 *  what carries the meaning, not the exact width of the gap. */
const THIN_SPACE = ' ';

/** Request and token counts are integers, not money, so they do NOT go through `formatUsd` — but
 *  they get the same thin-space grouping, because they sit in the same ledger. */
function formatCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

/**
 * Money, via the SHARED formatter — never a local `toFixed`. `formatUsd`'s adaptive precision is
 * why a genuinely sub-cent project reads as `$0.0063` here instead of the `$0.00` a fixed
 * two-decimal rule would print (see that module's header). The figure in the PDF is therefore the
 * same string the console shows on screen.
 *
 * This deliberately differs from the CSV's `total_cost_usd`, which is fixed 6dp: the CSV feeds a
 * spreadsheet, where a stable machine-readable scale beats legibility. The PDF is read by a
 * person.
 */
function formatMoney(microUsd: number): string {
  return formatUsd(microUsdToUsd(microUsd));
}

/** Left-aligned text that outgrows its column is truncated with an ellipsis — the only cell kind
 *  where dropping characters is honest, because an id or model name is an identifier, not a
 *  quantity. */
function fitText(text: string, chars: number): string {
  return text.length <= chars ? text : `${text.slice(0, chars - 1)}…`;
}

/**
 * A numeric cell that outgrows its column drops its thousands separators rather than being
 * truncated — a truncated number is a wrong number. Only reachable at magnitudes this report does
 * not realistically produce (15 characters of money is `$999 999 999.99`), so it is a correctness
 * backstop, not a formatting choice.
 */
function fitNumber(text: string, chars: number): string {
  return text.length <= chars ? text : text.split(THIN_SPACE).join('');
}

function rowCells(row: ConsumptionRow): Cells {
  return {
    project: fitText(row.projectId, COLUMN_CHARS.project),
    model: fitText(row.model, COLUMN_CHARS.model),
    requests: fitNumber(formatCount(row.requests), COLUMN_CHARS.requests),
    prompt: fitNumber(formatCount(row.promptTokens), COLUMN_CHARS.prompt),
    completion: fitNumber(formatCount(row.completionTokens), COLUMN_CHARS.completion),
    tokens: fitNumber(formatCount(row.totalTokens), COLUMN_CHARS.tokens),
    cost: fitNumber(formatMoney(row.totalCostMicroUsd), COLUMN_CHARS.cost),
  };
}

// ── Document assembly ────────────────────────────────────────────────────────────────────────

export type ConsumptionPdfMeta = {
  /** `YYYY-MM`, already validated by the route. */
  period: string;
  accountId: string;
  /** Absent when the caller had no project selected — the report then covers the whole account. */
  projectId?: string;
  /** Passed in rather than read off the clock, so the same inputs always produce the same bytes. */
  generatedAt: Date;
};

export const PDF_TITLE = 'Consumption report';

/** Rendered in place of body rows when the month genuinely has no usage. The TOTAL row still
 *  prints (as zeros) — a report that silently omits its total looks truncated. */
export const EMPTY_REPORT_NOTE = 'No usage recorded for this period.';

export const TOTAL_LABEL = 'TOTAL';

type Entry = { cells: Cells; total: boolean };

function drawCells(ops: PdfOp[], cells: Cells, y: number, bold: boolean, greyLevel: number): void {
  for (const column of COLUMNS) {
    const text = cells[column.key];
    if (text.length === 0) continue;
    const bounds = COLUMN_BOUNDS[column.key];
    const x =
      column.align === 'right' ? bounds.right - monoWidth(text.length, BODY_SIZE) : bounds.left;
    ops.push({
      kind: 'text',
      x,
      y,
      text,
      font: bold ? 'mono-bold' : 'mono',
      size: BODY_SIZE,
      grey: greyLevel,
    });
  }
}

/** The column-header band. Called on EVERY page: a five-page report whose columns are only named
 *  on page one is unreadable from page two onward. Returns the first body row's baseline. */
function drawColumnHeaders(ops: PdfOp[], top: number): number {
  for (const column of COLUMNS) {
    const bounds = COLUMN_BOUNDS[column.key];
    const x =
      column.align === 'right'
        ? bounds.right - monoWidth(column.header.length, HEADER_SIZE)
        : bounds.left;
    ops.push({
      kind: 'text',
      x,
      y: top,
      text: column.header,
      font: 'mono-bold',
      size: HEADER_SIZE,
      grey: 0.35,
    });
  }
  const ruleY = top - 5;
  ops.push({ kind: 'rule', x: MARGIN_X, y: ruleY, width: CONTENT_WIDTH, grey: 0.55 });
  return ruleY - ROW_HEIGHT;
}

function scopeLine(meta: ConsumptionPdfMeta): string {
  const scope = meta.projectId ? `Project ${meta.projectId}` : 'All projects';
  return `Account ${meta.accountId}  ·  ${scope}  ·  Period ${meta.period}`;
}

/** Page 1's masthead. Returns the column-header baseline. */
function drawFirstPageHeading(ops: PdfOp[], meta: ConsumptionPdfMeta): number {
  let y = PAGE.height - MARGIN_TOP;
  ops.push({ kind: 'text', x: MARGIN_X, y, text: PDF_TITLE, font: 'sans-bold', size: 16 });
  y -= 20;
  ops.push({
    kind: 'text',
    x: MARGIN_X,
    y,
    text: scopeLine(meta),
    font: 'mono',
    size: 8,
    grey: 0.3,
  });
  y -= 12;
  ops.push({
    kind: 'text',
    x: MARGIN_X,
    y,
    text: `Generated ${meta.generatedAt.toISOString()}  ·  Grouped by project × model`,
    font: 'mono',
    size: 8,
    grey: 0.45,
  });
  y -= 18;
  ops.push({ kind: 'rule', x: MARGIN_X, y, width: CONTENT_WIDTH, thickness: 1, grey: 0.2 });
  return y - 20;
}

/** Pages 2+ carry a one-line running head instead of the masthead — the reader needs to know what
 *  the sheet in their hand is, not to re-read the title block. Returns the column-header baseline. */
function drawRunningHeading(ops: PdfOp[], meta: ConsumptionPdfMeta): number {
  let y = PAGE.height - MARGIN_TOP;
  ops.push({
    kind: 'text',
    x: MARGIN_X,
    y,
    text: `${PDF_TITLE}  ·  ${scopeLine(meta)}`,
    font: 'mono',
    size: 8,
    grey: 0.35,
  });
  y -= 10;
  ops.push({ kind: 'rule', x: MARGIN_X, y, width: CONTENT_WIDTH, grey: 0.55 });
  return y - 20;
}

function drawFooter(ops: PdfOp[], meta: ConsumptionPdfMeta, page: number, pageCount: number): void {
  ops.push({
    kind: 'text',
    x: MARGIN_X,
    y: FOOTER_BASELINE,
    text: `Lightbridge Console  ·  consumption-${meta.period}.pdf`,
    font: 'mono',
    size: HEADER_SIZE,
    grey: 0.5,
  });
  const pageLabel = `Page ${page} of ${pageCount}`;
  ops.push({
    kind: 'text',
    x: MARGIN_X + CONTENT_WIDTH - monoWidth(pageLabel.length, HEADER_SIZE),
    y: FOOTER_BASELINE,
    text: pageLabel,
    font: 'mono',
    size: HEADER_SIZE,
    grey: 0.5,
  });
}

/** How many body rows fit between the first row's baseline and the footer. */
function rowCapacity(firstRowBaseline: number): number {
  return Math.max(1, Math.floor((firstRowBaseline - (FOOTER_BASELINE + 18)) / ROW_HEIGHT));
}

/**
 * Splits the entries across pages. The TOTAL row is the last ENTRY rather than a special case
 * appended after pagination, which is what keeps it from being orphaned: it occupies the last
 * slot like any other row, and if that slot lands on a fresh page, that page gets the repeated
 * column headers for free.
 */
function paginate(entryCount: number, firstCapacity: number, restCapacity: number): number[] {
  if (entryCount <= firstCapacity) return [entryCount];
  const perPage = [firstCapacity];
  let remaining = entryCount - firstCapacity;
  while (remaining > 0) {
    const take = Math.min(restCapacity, remaining);
    perPage.push(take);
    remaining -= take;
  }
  return perPage;
}

/**
 * Renders the consumption report as a complete PDF file.
 *
 * `rows` MUST come from `aggregateConsumptionRows` — this function never groups anything itself,
 * and the TOTAL row is `consumptionTotals(rows)`, the same call the CSV makes.
 */
export function renderConsumptionPdf(
  rows: readonly ConsumptionRow[],
  meta: ConsumptionPdfMeta
): Uint8Array<ArrayBuffer> {
  const totals = consumptionTotals(rows);
  const entries: Entry[] = rows.map((row) => ({ cells: rowCells(row), total: false }));
  entries.push({
    cells: {
      project: TOTAL_LABEL,
      model: '',
      requests: fitNumber(formatCount(totals.requests), COLUMN_CHARS.requests),
      prompt: fitNumber(formatCount(totals.promptTokens), COLUMN_CHARS.prompt),
      completion: fitNumber(formatCount(totals.completionTokens), COLUMN_CHARS.completion),
      tokens: fitNumber(formatCount(totals.totalTokens), COLUMN_CHARS.tokens),
      cost: fitNumber(formatMoney(totals.totalCostMicroUsd), COLUMN_CHARS.cost),
    },
    total: true,
  });

  // Laid out once against a throwaway op list purely to measure where the body starts on each of
  // the two page kinds, so pagination and rendering agree by construction.
  const probe: PdfOp[] = [];
  const firstBodyTop = drawColumnHeaders(probe, drawFirstPageHeading(probe, meta));
  const restBodyTop = drawColumnHeaders(probe, drawRunningHeading(probe, meta));
  const emptyNoteRows = rows.length === 0 ? 1 : 0;
  const perPage = paginate(
    entries.length + emptyNoteRows,
    rowCapacity(firstBodyTop),
    rowCapacity(restBodyTop)
  );

  const pages: PdfOp[][] = [];
  let entryIndex = 0;
  perPage.forEach((count, pageIndex) => {
    const ops: PdfOp[] = [];
    const headerTop =
      pageIndex === 0 ? drawFirstPageHeading(ops, meta) : drawRunningHeading(ops, meta);
    let y = drawColumnHeaders(ops, headerTop);
    let slots = count;

    if (pageIndex === 0 && emptyNoteRows === 1) {
      ops.push({
        kind: 'text',
        x: MARGIN_X,
        y,
        text: EMPTY_REPORT_NOTE,
        font: 'sans',
        size: 9,
        grey: 0.4,
      });
      y -= ROW_HEIGHT;
      slots -= 1;
    }

    for (let taken = 0; taken < slots; taken += 1) {
      const entry = entries[entryIndex];
      entryIndex += 1;
      if (entry.total) {
        ops.push({ kind: 'rule', x: MARGIN_X, y: y + 8, width: CONTENT_WIDTH, grey: 0.55 });
      }
      drawCells(ops, entry.cells, y, entry.total, entry.total ? 0 : 0.15);
      y -= ROW_HEIGHT;
    }

    pages.push(ops);
  });

  pages.forEach((ops, index) => drawFooter(ops, meta, index + 1, pages.length));

  return renderPdfDocument({
    pageSize: PAGE,
    pages,
    title: `${PDF_TITLE} — ${meta.accountId} — ${meta.period}`,
    createdAt: meta.generatedAt,
  });
}
