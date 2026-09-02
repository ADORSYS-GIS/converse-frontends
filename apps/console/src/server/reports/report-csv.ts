import type { ReportDocument } from './report-data';

/**
 * `format=csv` for a dashboard report (converse-frontends#453): the underlying grouped rows of
 * every panel, ONE SECTION PER PANEL, and nothing Typst ever sees.
 *
 * A dashboard is not one table, so this is not one CSV table either. Flattening nine panels of
 * different shapes into a single sheet would need a lowest-common-denominator schema that fits
 * none of them; a section per panel keeps each panel's own columns, and a spreadsheet opens it
 * fine. The section header carries the panel id as well as its title, so a row can be traced back
 * to the `dashboards.yaml` entry that produced it.
 *
 * Deliberately NOT the same code as `consumption-csv.ts`. That module owns the consumption
 * report's own project × model grouping and its `TOTAL` row, byte for byte, and this story keeps
 * it byte-identical — a shared "CSV writer" abstraction over two documents with different
 * contracts would be the thing that lets one drift into the other.
 */

/** RFC 4180 quoting, applied only when the field needs it. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvLine(fields: readonly string[]): string {
  return `${fields.map(csvField).join(',')}\r\n`;
}

export function reportCsvLines(document: ReportDocument): string[] {
  const lines: string[] = [];

  // A header block, so a downloaded file still says what it is a month later — which window, which
  // page, generated when. Comment-prefixed (`#`) so a spreadsheet import can skip it.
  lines.push(csvLine([`# ${document.title}`]));
  lines.push(csvLine([`# route`, document.route]));
  lines.push(csvLine([`# range`, document.rangeLabel]));
  lines.push(csvLine([`# window_start_utc`, document.window.start]));
  lines.push(csvLine([`# window_end_utc`, document.window.end]));
  lines.push(csvLine([`# generated_at_utc`, document.generatedAt]));
  for (const filter of document.filters) {
    lines.push(csvLine([`# ${filter.label.toLowerCase()}`, filter.value]));
  }

  for (const panel of document.panels) {
    lines.push('\r\n');
    lines.push(csvLine([`# panel`, panel.id, panel.title]));

    if (panel.unavailable) {
      // The panel is NAMED and its absence stated, never silently skipped: a section missing from
      // a CSV is indistinguishable from a panel that had no data.
      lines.push(csvLine([`# unavailable`, panel.unavailable]));
      continue;
    }

    if (panel.stats) {
      lines.push(csvLine(['label', 'value', 'delta']));
      for (const stat of panel.stats) {
        lines.push(csvLine([stat.label, stat.value, stat.delta ?? '']));
      }
    }

    if (panel.table) {
      lines.push(csvLine(panel.table.columns));
      for (const row of panel.table.rows) {
        lines.push(csvLine(row));
      }
    }

    if (!panel.stats && !panel.table) {
      lines.push(csvLine([`# no tabular rows for this panel type`, panel.type]));
    }
  }

  return lines;
}

export function reportCsv(document: ReportDocument): string {
  return reportCsvLines(document).join('');
}
