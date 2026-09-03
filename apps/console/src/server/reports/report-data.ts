import type { UsageQueryResponse } from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web/src/lib/money';
import type { DashboardPanelView } from '@lightbridge/ui-web/src/sections/dashboard-panels/types';

import type { DashboardPanelSpec } from '../../dashboards/dashboard-spec';
import { toPanelView } from '../../dashboards/panel-adapters';
import type { ResolvedDashboard } from '../../dashboards/resolve-dashboard';
import { isChartPanelView, renderPanelSvg } from './panel-svg';
import type { ReportBranding } from './report-branding';
import type { Translate } from '../../i18n/config';

/**
 * `data.json` — everything a `.typ` template is allowed to know (converse-frontends#453).
 *
 * The story's contract, stated as a type: a template "receives `panels[]` … and decides **only**
 * document chrome — header, section order, captions. A template must not be able to change which
 * panels exist or what they query." Nothing here is a query, a filter, a URL or a credential; it
 * is the same rendered figures the page shows, already formatted by the same adapters, plus the
 * file name of a chart image. A hostile template can reorder or omit sections of its own report.
 * It cannot make the console fetch something else.
 *
 * The panel list is walked in `resolveDashboard`'s order — the SAME resolved list `useDashboard`
 * renders — which is what makes "a panel added to `dashboards.yaml` appears in the report with no
 * template change" true rather than aspirational.
 */

/** How a chart panel's asset is named inside the render root. Stable and derived from the panel
 *  id, so a template can also reference one by name if it wants a bespoke layout. */
export function panelAssetPath(panelId: string): string {
  return `panels/${panelId}.svg`;
}

export interface ReportStat {
  label: string;
  value: string;
  /** Pre-worded, e.g. `+12% vs previous month`. Never a raw number, never a colour — the console's
   *  own delta rule (never green/red) holds on paper for the same reason. */
  delta?: string;
}

export interface ReportTable {
  columns: string[];
  /** Already-formatted cells. Money went through `formatUsd`, counts through `toLocaleString` —
   *  the same functions the screen used, so a figure cannot differ between the two renderings. */
  rows: string[][];
}

export interface ReportPanel {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  span: 1 | 2;
  /** The panel's honesty caption — a log/indexed axis note, a truncation notice. Present exactly
   *  when the screen would show one. */
  caption?: string;
  /** Path of this panel's SVG inside the render root, or absent when the panel is not
   *  chart-shaped. `image("/" + panel.chart)` in a template — the leading slash matters, see
   *  `_lib/report.typ`. */
  chart?: string;
  /** The chart's own width ÷ height. A template bounds a WIDE board by the text width and a
   *  SQUARE ring by a max height; without this it can only guess, and guessing "wide" turns a ring
   *  into a full-page circle (found by the live-renderer test, not by reading the docs). */
  chartAspect?: number;
  stats?: ReportStat[];
  table?: ReportTable;
  /** Set instead of data when this panel's own query failed. The report SAYS so rather than
   *  printing an empty section that reads as "no usage". */
  unavailable?: string;
}

export interface ReportDocument {
  /** The report's own title — the page's title, not the file name. */
  title: string;
  /**
   * The configured brand — `{logo?, name?}` — absent entirely when this deployment configured
   * none (owner feedback 2026-09-03). `logo` is an asset path inside the render root, written
   * there from the SAME file the console header serves; `_lib/report.typ` draws it left of the
   * title and falls back to the name, then to the title alone. See `report-branding.ts`.
   */
  branding?: ReportBranding;
  /** The router path this report is a rendering of. */
  route: string;
  /** Human wording for the window, e.g. `This month`. */
  rangeLabel: string;
  window: { start: string; end: string };
  /** ISO instant the report was produced. UTC, like every other timestamp in this console. */
  generatedAt: string;
  /** Route params and URL knobs the page was viewed with — `{label, value}` pairs, already
   *  resolved for display. */
  filters: { label: string; value: string }[];
  /** Which template rendered this, and whether it was an operator override. Printed in the
   *  footer, so a reader holding a customised report can tell. */
  template: { route: string; origin: string };
  /** The reader's own "Include tables" choice. Templates honour it; the data is present either
   *  way so a customised template can decide differently for its own route. */
  includeTables: boolean;
  /**
   * The template's OWN fixed labels, already translated (ADR 0017).
   *
   * A `.typ` template is Typst source with no i18n runtime and no way to reach one — it can read
   * `data.json` and nothing else — so every word a template prints on its own behalf has to
   * arrive in the data. That is the whole of the report i18n contract: **the console translates,
   * the template renders.** It also means an operator's own override
   * (`${CONSOLE_TEMPLATES_DIR}/<route>/report.typ`) gets translated chrome for free, without
   * having to know a locale exists — it reads `report.labels.generated` exactly as the shipped
   * template does.
   */
  labels: ReportLabels;
  panels: ReportPanel[];
}

/** The fixed words `_lib/report.typ` prints that are not data: the header's "Generated", the
 *  footer's "template", and the empty-table line. */
export interface ReportLabels {
  generated: string;
  template: string;
  noRows: string;
}

/** Renders a share as the console's own wording — `<1%` rather than `0%`, which would claim a
 *  measured zero. */
function formatShare(value: number, total: number): string {
  if (total <= 0) return '—';
  const percent = (value / total) * 100;
  if (percent > 0 && percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * A panel's values as a table.
 *
 * **Why a chart panel gets one too, against the console's own "no legend lists" rule.** That rule
 * (owner, 2026-08-31) exists because a screen has a pointer: values live in a Floating-UI tooltip,
 * and a permanent list under the chart would restate in words what hovering already says. Paper
 * has no pointer. A ring or a five-line board printed with no values states nothing a reader can
 * act on, so in a REPORT the values ride under the mark — and behind the dialog's own
 * "Include tables" toggle, which is exactly the choice that toggle exists to offer. The rule is
 * unchanged where it applies; this is the medium changing, not the doctrine.
 */
export function panelTable(
  view: DashboardPanelView,
  t: Translate,
  locale: string
): ReportTable | undefined {
  switch (view.kind) {
    // A latency series has no honest "share of total" — percentiles do not add up — so it states
    // each series' WORST bucket rather than a sum that would mean nothing.
    case 'latency-series':
      return {
        columns: [t('column.series'), t('column.worst-bucket')],
        rows: view.series.map((entry) => [
          entry.label,
          `${Math.round(Math.max(0, ...entry.points.map((point) => point.y)))} ms`,
        ]),
      };

    case 'series': {
      const format = view.formatValue ?? formatUsd;
      const totals = view.series.map((entry) => ({
        label: entry.label,
        value: sum(entry.points.map((point) => point.y)),
      }));
      const grand = sum(totals.map((entry) => entry.value));
      return {
        columns: [t('column.series'), t('column.total'), t('column.share')],
        rows: totals.map((entry) => [
          entry.label,
          format(entry.value),
          formatShare(entry.value, grand),
        ]),
      };
    }

    case 'ranked': {
      const grand = sum(view.rows.map((row) => Math.max(row.value, 0)));
      return {
        columns: [t('column.name'), t('column.value'), t('column.share')],
        rows: view.rows.map((row) => [
          row.label,
          row.formattedValue ?? String(row.value),
          formatShare(Math.max(row.value, 0), grand),
        ]),
      };
    }

    case 'share':
    case 'donut': {
      const grand = sum(view.segments.map((segment) => Math.max(segment.value, 0)));
      return {
        columns: [t('column.name'), t('column.value'), t('column.share')],
        rows: view.segments.map((segment) => [
          segment.label,
          segment.formattedValue ?? String(segment.value),
          formatShare(Math.max(segment.value, 0), grand),
        ]),
      };
    }

    case 'table':
      return {
        columns: view.columns.map((column) => column.header),
        rows: view.rows.map((row) =>
          view.columns.map((column) => {
            const cell = row.cells[column.key];
            // Cells are `ReactNode` by type but always pre-formatted strings/numbers in practice
            // (`panel-adapters.ts` builds them). Anything else states its absence rather than
            // rendering `[object Object]` into a document someone will forward.
            return typeof cell === 'string' || typeof cell === 'number' ? String(cell) : '—';
          })
        ),
      };

    case 'latency-cards':
      return {
        columns: [
          t('column.model'),
          t('column.p50'),
          t('column.p95'),
          t('column.p99'),
          t('column.samples'),
        ],
        rows: view.rows.map((row) => [
          row.model,
          `${Math.round(row.p50Ms)} ms`,
          `${Math.round(row.p95Ms)} ms`,
          // `null`/absent is "not enough samples to state a p99", which is not the same fact as
          // `0 ms` — a dash, never a fabricated zero.
          row.p99Ms == null ? '—' : `${Math.round(row.p99Ms)} ms`,
          // The reader's own locale, like every other figure in the document (ADR 0017).
          row.samples.toLocaleString(locale),
        ]),
      };

    default:
      return undefined;
  }
}

/** The stat cards a `stat`/`stat-group` panel shows. */
export function panelStats(view: DashboardPanelView, t: Translate): ReportStat[] | undefined {
  if (view.kind === 'stat') {
    return [
      {
        label: view.label,
        value: view.metric,
        delta: view.delta ? deltaWording(view.delta.direction, view.delta.label, t) : undefined,
      },
    ];
  }
  if (view.kind === 'stat-group') {
    return view.stats.map((stat) => ({
      label: stat.label,
      value: stat.metric,
      delta: stat.delta ? deltaWording(stat.delta.direction, stat.delta.label, t) : undefined,
    }));
  }
  return undefined;
}

/** `StatCard`'s glyph is a shape on screen; on paper it is a word, because a lone `▲` beside a
 *  number in a forwarded PDF reads as decoration. Never a colour, on either medium. */
function deltaWording(direction: 'up' | 'down' | 'flat', label: string, t: Translate): string {
  const prefix = direction === 'up' ? t('delta.up') : direction === 'down' ? t('delta.down') : '';
  return prefix ? `${prefix} ${label}` : label;
}

export interface BuildReportInput {
  resolved: ResolvedDashboard;
  /** One entry per `resolved.queries` index; `null` where that query failed. */
  responses: (UsageQueryResponse | null)[];
  title: string;
  rangeLabel: string;
  filters: { label: string; value: string }[];
  template: { route: string; origin: string };
  includeTables: boolean;
  generatedAt: Date;
  /** The configured brand, from `resolveReportBranding`. Omitted when none is configured. */
  branding?: ReportBranding;
  /** The `reports` namespace bound to THIS request's locale (ADR 0017) — column headers, the
   *  delta wording, the unavailable line, and the fixed labels the `.typ` templates print. */
  t: Translate;
  /** The BCP-47 tag every `toLocaleString` in the document formats against. */
  locale: string;
}

export interface BuiltReport {
  document: ReportDocument;
  /** `panels/<id>.svg` → the SVG source, ready to be base64'd into the render request's `assets`. */
  assets: Record<string, string>;
}

/**
 * The resolved dashboard plus its responses → `data.json` and the chart assets.
 *
 * Panel views come from `toPanelView` — the SAME adapter the browser renders through — so a figure
 * in the PDF is not merely "computed the same way" as the one on screen, it is computed by the
 * same function. `scale`/`onScaleChange` are the one thing a report has to invent: the screen
 * holds the scale in the URL and a report has no URL, so it takes the panel's own YAML default
 * and a no-op setter that nothing can call, since `static` mode renders no control.
 */
export function buildReport(input: BuildReportInput): BuiltReport {
  const assets: Record<string, string> = {};

  const panels: ReportPanel[] = input.resolved.panels.map((panel): ReportPanel => {
    const spec: DashboardPanelSpec = panel.spec;
    const base = {
      id: spec.id,
      type: spec.type,
      title: spec.title,
      subtitle: spec.subtitle,
      span: spec.span,
    };

    // `queryIndex` is optional since C12 (converse-frontends#455): a `scope: family` panel
    // resolves to one query PER family account, and to none at all when no account list was
    // supplied — which is exactly the case here, since a report route has no session to read one
    // from. `resolvePageReport` refuses such a page outright rather than letting it reach this
    // point, so this is the same "could not be loaded" branch a failed query already takes.
    const response = panel.queryIndex === undefined ? undefined : input.responses[panel.queryIndex];
    if (!response) {
      return { ...base, unavailable: input.t('panel.unavailable') };
    }

    const compareResponse =
      panel.compareQueryIndex !== undefined
        ? (input.responses[panel.compareQueryIndex] ?? undefined)
        : undefined;

    const view = toPanelView({
      spec,
      response,
      compareResponse,
      compareWindow: compareResponse ? panel.compareWindow : undefined,
      // The dashed overlay's re-base, passed for the same reason every other field here is: the
      // PDF renders through the SAME adapter the browser does, so a series board that carries a
      // "previous period" line on screen must carry it in the report too — and without the shift
      // it would be plotted at its real dates and double the chart's x-domain
      // (converse-frontends#448).
      compareShiftMs: compareResponse ? panel.compareShiftMs : undefined,
      scale: spec.options?.scale ?? 'linear',
      onScaleChange: () => undefined,
    });

    const chart = isChartPanelView(view) ? renderPanelSvg(view, spec.span) : null;
    if (chart) assets[panelAssetPath(spec.id)] = chart.svg;

    return {
      ...base,
      caption: chart?.caption,
      chart: chart ? panelAssetPath(spec.id) : undefined,
      chartAspect: chart ? chart.width / chart.height : undefined,
      stats: panelStats(view, input.t),
      table: panelTable(view, input.t, input.locale),
    };
  });

  return {
    document: {
      title: input.title,
      ...(input.branding ? { branding: input.branding } : {}),
      route: input.resolved.route,
      rangeLabel: input.rangeLabel,
      window: {
        start: input.resolved.window.start.toISOString(),
        end: input.resolved.window.end.toISOString(),
      },
      generatedAt: input.generatedAt.toISOString(),
      filters: input.filters,
      template: input.template,
      includeTables: input.includeTables,
      labels: {
        generated: input.t('chrome.generated'),
        template: input.t('chrome.template'),
        noRows: input.t('chrome.no-rows'),
      },
      panels,
    },
    assets,
  };
}
