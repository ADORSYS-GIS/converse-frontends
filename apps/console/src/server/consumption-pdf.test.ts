import { formatUsd } from '@lightbridge/ui-web/src/lib/money';
import { extractText } from 'unpdf';
import { describe, expect, it } from 'vitest';

import {
  aggregateConsumptionRows,
  consumptionTotals,
  microUsdToUsd,
  type UsageSeriesPoint,
} from './consumption-csv';
import {
  EMPTY_REPORT_NOTE,
  PDF_TITLE,
  TOTAL_LABEL,
  renderConsumptionPdf,
  type ConsumptionPdfMeta,
} from './consumption-pdf';

/**
 * These tests assert on the GENERATED DOCUMENT, and they read it back with `unpdf` — Mozilla's
 * pdf.js — rather than with the writer's own idea of what it wrote. An independent reader is the
 * only assertion worth making about a binary format: it is the same code path a browser, Preview
 * or a printer takes, so "pdf.js extracted this text from page 3" is evidence, where
 * "our own serialiser says it emitted this" would be a tautology.
 *
 * Nothing here snapshots bytes. A byte-for-byte snapshot of a binary format goes red for every
 * cosmetic change and tells you nothing about whether the document is still readable.
 */

const GENERATED_AT = new Date('2026-02-28T10:00:00Z');

const META: ConsumptionPdfMeta = {
  period: '2026-02',
  accountId: 'acct_01',
  generatedAt: GENERATED_AT,
};

const point = (overrides: Partial<UsageSeriesPoint> = {}): UsageSeriesPoint => ({
  project_id: 'proj_1',
  model: 'gpt-4o',
  requests: 10,
  prompt_tokens: 100,
  completion_tokens: 50,
  total_tokens: 150,
  total_cost: 1_000_000,
  ...overrides,
});

function render(points: readonly UsageSeriesPoint[], meta: Partial<ConsumptionPdfMeta> = {}) {
  return renderConsumptionPdf(aggregateConsumptionRows(points), { ...META, ...meta });
}

async function readText(bytes: Uint8Array): Promise<string> {
  const { text } = await extractText(bytes, { mergePages: true });
  return text;
}

/** The single `TOTAL …` line out of the extracted text, so a test can assert every cell of it.
 *  Matched on the label plus a space: `TOTAL TOKENS` is a COLUMN HEADER and must not match. */
function totalLine(text: string): string | undefined {
  return text.split('\n').find((line) => line.startsWith(`${TOTAL_LABEL} `));
}

async function readPages(bytes: Uint8Array): Promise<string[]> {
  const { text } = await extractText(bytes, { mergePages: false });
  return text;
}

describe('renderConsumptionPdf', () => {
  it('produces a file a PDF reader recognises — header bytes, %%EOF, and a parseable page tree', async () => {
    const bytes = render([point()]);

    expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
    expect(Buffer.from(bytes).toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true);

    const { totalPages } = await extractText(bytes, { mergePages: true });
    expect(totalPages).toBe(1);
  });

  it('reads as a document, not a CSV in a wrapper — title, scope, period and generation stamp', async () => {
    const text = await readText(render([point()], { projectId: 'proj_7' }));

    expect(text).toContain(PDF_TITLE);
    expect(text).toContain('Account acct_01');
    expect(text).toContain('Project proj_7');
    expect(text).toContain('Period 2026-02');
    expect(text).toContain('Generated 2026-02-28T10:00:00.000Z');
  });

  it('says "All projects" when the report was not narrowed to one', async () => {
    expect(await readText(render([point()]))).toContain('All projects');
  });

  it('carries one row per (project, model) group, with its counts', async () => {
    const text = await readText(
      render([
        point({ project_id: 'proj_a', model: 'gpt-4o', requests: 1200 }),
        point({ project_id: 'proj_b', model: 'claude-opus-5', requests: 3 }),
      ])
    );

    expect(text).toContain('proj_a');
    expect(text).toContain('gpt-4o');
    expect(text).toContain('proj_b');
    expect(text).toContain('claude-opus-5');
    // Thousands grouped, as the ledger contract asks — the thin space arrives as a normal space,
    // which is the one substitution the PDF's WinAnsi encoding forces.
    expect(text).toContain('1 200');
  });

  it('names an unattributed point instead of dropping it', async () => {
    const text = await readText(render([point({ project_id: null, model: null })]));
    expect(text).toContain('(unattributed)');
  });

  it('renders money through the shared formatUsd, never a local toFixed', async () => {
    // 6338 micro-USD is $0.006338 — the production value `formatUsd`'s precision ladder exists
    // for. A `toFixed(2)` would print `$0.01`; the CSV's own `toFixed(6)` would print `$0.006338`.
    // Only the shared formatter yields `$0.0063`.
    const text = await readText(render([point({ total_cost: 6338 })]));

    expect(formatUsd(microUsdToUsd(6338))).toBe('$0.0063');
    expect(text).toContain('$0.0063');
    expect(text).not.toContain('$0.01');
    expect(text).not.toContain('$0.006338');
  });

  it('groups thousands in money the way the on-screen figure does', async () => {
    const text = await readText(render([point({ total_cost: 1_131_800_000 })]));
    expect(formatUsd(microUsdToUsd(1_131_800_000))).toBe('$1 131.80');
    expect(text).toContain('$1 131.80');
  });

  it('totals from consumptionTotals — the same sum the CSV prints, not a second grouping', async () => {
    const points = [
      point({ project_id: 'proj_a', requests: 10, total_cost: 1_500_000 }),
      point({ project_id: 'proj_b', requests: 5, total_cost: 2_250_000 }),
    ];
    const rows = aggregateConsumptionRows(points);
    const totals = consumptionTotals(rows);
    const text = await readText(render(points));

    // The whole TOTAL line, not just its money cell: this is the assertion that goes red if the
    // PDF ever starts summing something the CSV does not.
    expect(totalLine(text)).toBe('TOTAL 15 200 100 300 $3.75');
    expect(formatUsd(microUsdToUsd(totals.totalCostMicroUsd))).toBe('$3.75');
  });

  it('paginates a long report, repeats the column headers, and lands TOTAL on the last page', async () => {
    const points = Array.from({ length: 140 }, (_, index) =>
      point({ project_id: `proj_${String(index).padStart(3, '0')}`, requests: index })
    );
    const pages = await readPages(render(points));

    expect(pages.length).toBeGreaterThan(1);

    for (const page of pages) {
      expect(page).toContain('PROJECT');
      expect(page).toContain('COST (USD)');
    }

    // The masthead belongs to page 1 only; every later page carries the compact running head.
    expect(pages[0]).toContain('Generated 2026-02-28T10:00:00.000Z');
    expect(pages[1]).not.toContain('Generated 2026-02-28T10:00:00.000Z');
    expect(pages[1]).toContain(PDF_TITLE);

    expect(totalLine(pages.at(-1) ?? '')).toBeDefined();
    expect(pages.slice(0, -1).some((page) => totalLine(page) !== undefined)).toBe(false);

    pages.forEach((page, index) => {
      expect(page).toContain(`Page ${index + 1} of ${pages.length}`);
    });
  });

  it('never orphans a row: every generated row appears exactly once across the pages', async () => {
    const points = Array.from({ length: 140 }, (_, index) =>
      point({ project_id: `proj_${String(index).padStart(3, '0')}` })
    );
    const merged = await readText(render(points));

    for (let index = 0; index < 140; index += 1) {
      expect(merged).toContain(`proj_${String(index).padStart(3, '0')}`);
    }
  });

  it('names an empty month rather than printing a headed table with nothing under it', async () => {
    const text = await readText(render([]));

    expect(text).toContain(EMPTY_REPORT_NOTE);
    // The TOTAL still prints, as zeros — a report that omits its total reads as truncated.
    expect(totalLine(text)).toBe('TOTAL 0 0 0 0 $0.00');
  });

  it('truncates an over-long identifier with an ellipsis instead of overflowing its column', async () => {
    const text = await readText(
      render([point({ project_id: 'proj_with_a_very_long_identifier_indeed' })])
    );

    expect(text).toContain('proj_with_a_very_…');
    expect(text).not.toContain('proj_with_a_very_long_identifier_indeed');
  });

  it('is reproducible — the same rows and the same stamp produce the same bytes', () => {
    expect(render([point()])).toEqual(render([point()]));
  });
});
