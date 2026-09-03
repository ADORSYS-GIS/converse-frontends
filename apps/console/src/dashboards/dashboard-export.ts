import type { UsageWindow } from '../containers/comparison-window';

/**
 * The export URL a dashboard page's Export button downloads, built from the SAME identity the page
 * renders with (converse-frontends#453).
 *
 * Pure and React-free, like the rest of the engine's non-rendering half, so the URL contract is
 * unit-testable without a DOM — and so a reader can see the whole contract in one place:
 *
 * ```
 * GET /api/reports/page
 *   ?path=<dashboards.yaml route, [param] segments LITERAL>
 *   &range=mtd|7d|30d|90d[&from=YYYY-MM-DD&to=YYYY-MM-DD]
 *   &<each filter the page declares>=<value>
 *   &format=pdf|csv|html
 *   &tables=true|false
 * ```
 *
 * `path` is the ROUTE PATTERN, not the browser's current URL: the page already knows which YAML
 * entry it renders, and sending the key rather than a concrete path means the route validates it by
 * equality against its own document instead of matching a caller-supplied string back to a pattern.
 * The param VALUES travel as ordinary filters beside it.
 */

export type DashboardExportFormat = 'pdf' | 'csv' | 'html';

export interface DashboardExportUrlInput {
  /** The `dashboards.yaml` key — e.g. `/admin/usage/actors/[actorId]`. */
  route: string;
  /** The page's range preset, verbatim from the URL. */
  range: string;
  /** An explicit span, when the page's picker has one. Both or neither — a half-specified span is
   *  ignored by the route exactly as it is by `resolveOverviewWindow`. */
  from?: string;
  to?: string;
  /** The page's own filter values, keyed by the names it declares in `dashboards.yaml`. */
  filters?: Record<string, string | undefined>;
  format: DashboardExportFormat;
  includeTables: boolean;
}

export function dashboardExportUrl(input: DashboardExportUrlInput): string {
  const params = new URLSearchParams({
    path: input.route,
    range: input.range,
    format: input.format,
    // Explicit in both directions. The route defaults it ON, and a URL that states the reader's
    // choice is one a reader can bookmark and get the same document back from.
    tables: String(input.includeTables),
  });
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  for (const [name, value] of Object.entries(input.filters ?? {})) {
    if (value) params.set(name, value);
  }
  return `/api/reports/page?${params.toString()}`;
}

/** The window echoed read-only in the dialog. Dates only — a report's boundaries are days in UTC,
 *  and a time-of-day would suggest a precision the range picker does not offer. */
export function exportRangeEcho(rangeLabel: string, window: UsageWindow): string {
  const day = (date: Date) => date.toISOString().slice(0, 10);
  return `${rangeLabel} · ${day(window.start)} – ${day(window.end)} · UTC`;
}
