import { NextResponse, type NextRequest } from 'next/server';
import type { UsageQueryResponse } from '@lightbridge/api-rest';

import { serverEnv } from '../../../../server/env';
import { assemblePageReport, resolvePageReport } from '../../../../server/reports/page-report';
import { reportCsv } from '../../../../server/reports/report-csv';
import { reportHtml } from '../../../../server/reports/report-html';
import {
  readTemplateLibrary,
  resolveReportTemplate,
} from '../../../../server/reports/template-resolver';
import { renderPdf } from '../../../../server/reports/typst-client';
import { fetchUsageQueries } from '../../../../server/reports/usage-fetch';
import { clearSession, writeSession } from '../../../../server/session-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /api/reports/page?path=<route>&range=&from=&to=&format=pdf|csv|html&tables=&<page filters>`
 * — the dashboard export (converse-frontends#453).
 *
 * The whole point of the story, in one sentence: **the report walks the same resolved panel list
 * the page renders.** `path` names a `dashboards.yaml` entry, `resolveDashboard` (C3's, React-free
 * for exactly this reason) turns it into the same deduplicated query list `useDashboard` issues in
 * the browser, `toPanelView` turns the responses into the same views the browser draws, and the
 * `.typ` template mirroring the route path decides only the document's chrome. A panel added to
 * the YAML appears in the report with no template change and no code change here.
 *
 * ```mermaid
 * sequenceDiagram
 *     autonumber
 *     participant B as Browser (DashboardExportButton)
 *     participant R as this route
 *     participant Y as dashboards.yaml
 *     participant U as usage backend
 *     participant T as typst-render sidecar
 *
 *     B->>R: GET /api/reports/page?path&range&format
 *     R->>Y: findPage(path)
 *     Y-->>R: 404 unknown_route (path is matched by EQUALITY, never joined into a file path)
 *     R->>R: resolveDashboard -> deduplicated query list
 *     R->>U: POST /usage/v1/usage/query (once per deduplicated query, scope-guarded)
 *     U-->>R: points
 *     R->>R: toPanelView -> data.json + one static SVG per chart panel
 *     alt format=csv
 *         R-->>B: 200 text/csv (never touches Typst)
 *     else format=html
 *         R-->>B: 200 text/html preview (works with no sidecar)
 *     else format=pdf
 *         R->>T: POST /render {template, data, assets}
 *         T-->>R: 200 application/pdf
 *         T-->>R: 422 + typst stderr -> 422, template path named
 *         T-->>R: unreachable -> 502, never a chartless PDF
 *         R-->>B: 200 application/pdf
 *     end
 * ```
 *
 * The three error shapes are deliberate, and each is an acceptance criterion:
 *
 *  - **404** for a `path` that is not a declared route — including every traversal attempt, which
 *    cannot match a declared route by construction.
 *  - **422** for a template that did not compile, carrying Typst's stderr VERBATIM plus the file
 *    the template was read from. Swallowing a compile error into a generic 500 is named in the
 *    story as a failure mode.
 *  - **502** when the renderer is unreachable or unconfigured. It never degrades to a chartless
 *    PDF.
 */

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function fail(status: number, error: string, message?: string, detail?: string): NextResponse {
  return noStore(NextResponse.json({ error, message, detail }, { status }));
}

const FORMATS = ['pdf', 'csv', 'html'] as const;
type ReportFormat = (typeof FORMATS)[number];

const CONTENT_TYPE: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
  html: 'text/html; charset=utf-8',
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const format = (params.get('format') ?? 'pdf') as ReportFormat;
  if (!FORMATS.includes(format)) {
    return fail(400, 'invalid_format', 'format must be pdf, csv or html.');
  }

  // `tables` is the dialog's "Include tables" toggle. Defaults ON: a chart in a document nobody
  // can hover states nothing without its values (see `report-data.ts`'s `panelTable`).
  const includeTables = params.get('tables') !== 'false';

  const resolution = resolvePageReport({
    path: params.get('path'),
    range: params.get('range'),
    from: params.get('from'),
    to: params.get('to'),
    param: (name) => params.get(name),
    now: new Date(),
  });

  if (!resolution.ok) {
    if (resolution.failure.kind === 'unknown_route') {
      return fail(
        404,
        'unknown_route',
        `"${resolution.failure.route}" is not a dashboard route. ` +
          `Known routes: ${resolution.failure.known.join(', ')}.`
      );
    }
    if (resolution.failure.kind === 'unexportable_route') {
      // 400, not 404: the route EXISTS and is a real dashboard — it just asks a question that
      // needs the caller's own account family, which this renderer has no session to read
      // (converse-frontends#455). The page itself renders no Export action; this is the same
      // answer for a hand-built URL.
      return fail(400, 'unexportable_route', resolution.failure.message);
    }
    return fail(400, 'invalid_filter', resolution.failure.message);
  }

  const { resolved, context } = resolution;

  const usage = await fetchUsageQueries(request, resolved.queries);
  if (!usage.ok) {
    const response = fail(usage.status, usage.error, usage.message);
    if (usage.clearSession) clearSession(response);
    return response;
  }

  // The template is resolved BEFORE the document is assembled, even for `csv`/`html`, so its
  // origin (`override` / `shipped` / `default`) can be printed in every format's own footer — a
  // reader holding a customised report can tell that it is one.
  let template;
  try {
    template = resolveReportTemplate(context.route);
  } catch (error) {
    console.error('[console] Report template missing:', error);
    return fail(500, 'template_missing', (error as Error).message);
  }

  const built = assemblePageReport({
    resolved,
    context,
    responses: usage.payloads.map((payload) => payload as unknown as UsageQueryResponse),
    templateOrigin: template.origin,
    includeTables,
    generatedAt: new Date(),
  });

  const filename = `${context.slug}-${params.get('range') ?? 'mtd'}.${format === 'html' ? 'html' : format}`;

  if (format === 'csv') {
    return finish(usage.rotated, reportCsv(built.document), 'csv', filename);
  }

  if (format === 'html') {
    // Inline, not an attachment: this format exists to be LOOKED at in a new tab.
    return finish(
      usage.rotated,
      reportHtml(built.document, built.assets),
      'html',
      filename,
      'inline'
    );
  }

  const renderUrl = serverEnv().typstRenderUrl;
  if (!renderUrl) {
    return fail(
      502,
      'renderer_not_configured',
      'PDF export needs the typst-render service. Set reports.typstRenderUrl (TYPST_RENDER_URL). ' +
        'CSV and HTML export work without it.'
    );
  }

  const library = readTemplateLibrary();
  const outcome = await renderPdf(
    renderUrl,
    {
      template: template.source,
      data: built.document,
      assets: { ...built.assets, [library.path]: library.source },
    },
    request.signal
  );

  if (!outcome.ok) {
    if (outcome.kind === 'compile_error') {
      // Verbatim stderr, plus WHICH file and WHICH route — the two things an operator who mounted
      // a broken override has no other way to learn.
      console.error(`[console] Typst compile error for ${template.absolutePath}:`, outcome.detail);
      return fail(
        422,
        'template_compile_error',
        `The report template for "${context.route}" did not compile (${template.origin}: ${template.absolutePath}).`,
        outcome.detail
      );
    }
    if (outcome.kind === 'unreachable') {
      console.error('[console] typst-render unreachable:', outcome.detail);
      return fail(
        502,
        'renderer_unreachable',
        'The report renderer is unreachable. The PDF could not be produced.',
        outcome.detail
      );
    }
    console.error(`[console] typst-render answered ${outcome.status}:`, outcome.detail);
    return fail(
      502,
      'renderer_error',
      `The report renderer answered ${outcome.status}.`,
      outcome.detail
    );
  }

  return finish(usage.rotated, outcome.pdf, 'pdf', filename);
}

async function finish(
  rotated: Parameters<typeof writeSession>[1] | null,
  body: string | ArrayBuffer,
  format: ReportFormat,
  filename: string,
  disposition: 'attachment' | 'inline' = 'attachment'
): Promise<NextResponse> {
  const response = new NextResponse(body as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPE[format],
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
  if (rotated) await writeSession(response, rotated);
  return response;
}
