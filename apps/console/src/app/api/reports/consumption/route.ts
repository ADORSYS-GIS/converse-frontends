import { NextResponse, type NextRequest } from 'next/server';

import {
  aggregateConsumptionRows,
  isValidMonth,
  monthRange,
  streamConsumptionCsv,
  type UsageSeriesPoint,
} from '../../../../server/consumption-csv';
import {
  buildConsumptionReport,
  CONSUMPTION_TEMPLATE_ROUTE,
} from '../../../../server/reports/consumption-report';
import { serverEnv } from '../../../../server/env';
import { resolveReportBranding } from '../../../../server/reports/report-branding';
import { collectTemplateAssets } from '../../../../server/reports/template-assets';
import {
  readTemplateLibrary,
  resolveReportTemplate,
} from '../../../../server/reports/template-resolver';
import { renderPdf, type RenderAsset } from '../../../../server/reports/typst-client';
import { fetchUsageQueries } from '../../../../server/reports/usage-fetch';
import { clearSession, writeSession } from '../../../../server/session-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /api/reports/consumption?month=YYYY-MM&account=<id>[&project=<id>][&format=csv|pdf]` —
 * ticket #308 (CSV), migrated onto the Typst pipeline by converse-frontends#453.
 *
 * **What changed, and what deliberately did not.**
 *
 * The PDF is now produced by the `typst-render` sidecar from
 * `templates/reports/consumption/report.typ`, through the same `_lib/report.typ` library, the same
 * per-file override mechanism and the same client as every dashboard report. The hand-rolled PDF
 * 1.4 writer (`server/pdf-document.ts`) and `server/consumption-pdf.ts` are DELETED — a hard
 * cutover, no parallel path — because a report writer that cannot embed an image was a dead end
 * for a story whose entire point is charts in a report.
 *
 * The CSV is untouched: `consumption-csv.ts` still owns the project × model grouping and the
 * `TOTAL` row, still streams line by line, and its tests are unchanged. The FIGURES are unchanged
 * in both formats — same `formatUsd`, same thin-space grouping (`consumption-report.ts`).
 *
 * Two things this route GAINED by moving onto the shared path, both worth stating rather than
 * leaving as a quiet diff:
 *
 *  1. **The scope guard.** It previously forwarded `scope: 'account', scope_id: <?account=>` with
 *     the caller's bearer token and never checked that the caller owned that account —
 *     `usage-scope-guard.ts` was applied to `/api/usage/*` but not here. `fetchUsageQueries` now
 *     applies it, so this route is closed the same way the proxy is.
 *  2. **A 502 rather than a chartless PDF** when the renderer is unreachable or unconfigured. CSV
 *     is unaffected and keeps working with no sidecar at all.
 *
 * `month` alone is not enough to answer a *safe* query: `scope`/`scope_id` decide whose data comes
 * back, so `account` is required the same way `month` is, and `project` narrows further. Both come
 * from the same `ScopeSelect` value the report panel already renders.
 */

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function badRequest(error: string, message: string): NextResponse {
  return noStore(NextResponse.json({ error, message }, { status: 400 }));
}

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month');
  if (!month || !isValidMonth(month)) {
    return badRequest('invalid_month', 'month must be a valid YYYY-MM value.');
  }

  const accountId = request.nextUrl.searchParams.get('account');
  if (!accountId) {
    return badRequest('missing_account', 'account is required.');
  }
  const projectId = request.nextUrl.searchParams.get('project') || undefined;

  const format = request.nextUrl.searchParams.get('format') ?? 'csv';
  if (format !== 'csv' && format !== 'pdf') {
    return badRequest('invalid_format', 'format must be csv or pdf.');
  }

  const { startTime, endTime } = monthRange(month);
  const usage = await fetchUsageQueries(request, [
    {
      scope: 'account',
      scope_id: accountId,
      start_time: startTime,
      end_time: endTime,
      group_by: ['project_id', 'model'],
      ...(projectId ? { filters: { project_id: projectId } } : {}),
    },
  ]);

  if (!usage.ok) {
    const response = noStore(
      NextResponse.json({ error: usage.error, message: usage.message }, { status: usage.status })
    );
    if (usage.clearSession) clearSession(response);
    return response;
  }

  // ONE aggregation, whatever the format — `aggregateConsumptionRows` is the single owner of the
  // project × model grouping and `consumptionTotals` of the TOTAL row, so the CSV and the PDF are
  // the same report and cannot drift apart.
  const rows = aggregateConsumptionRows(
    (usage.payloads[0]?.points ?? []) as unknown as UsageSeriesPoint[]
  );

  if (format === 'csv') {
    return finish(
      streamConsumptionCsv(rows),
      'text/csv; charset=utf-8',
      month,
      'csv',
      usage.rotated
    );
  }

  const renderUrl = serverEnv().typstRenderUrl;
  if (!renderUrl) {
    return noStore(
      NextResponse.json(
        {
          error: 'renderer_not_configured',
          message:
            'PDF export needs the typst-render service. Set reports.typstRenderUrl ' +
            '(TYPST_RENDER_URL). CSV export works without it.',
        },
        { status: 502 }
      )
    );
  }

  let template;
  try {
    template = resolveReportTemplate(CONSUMPTION_TEMPLATE_ROUTE);
  } catch (error) {
    console.error('[console] Consumption report template missing:', error);
    return noStore(
      NextResponse.json(
        { error: 'template_missing', message: (error as Error).message },
        { status: 500 }
      )
    );
  }

  // The consumption report gets the same letterhead and the same template-sibling assets as every
  // dashboard report — it shares `_lib/report.typ`'s header, so branding it separately would mean
  // two answers to one question.
  const templateAssets = collectTemplateAssets(CONSUMPTION_TEMPLATE_ROUTE);
  if (!templateAssets.ok) {
    console.error('[console] Consumption template assets over budget:', templateAssets);
    return noStore(
      NextResponse.json(
        { error: 'template_assets_too_large', message: templateAssets.message },
        { status: 413 }
      )
    );
  }
  const branding = resolveReportBranding(serverEnv().branding);

  const document = buildConsumptionReport({
    rows,
    month,
    accountId,
    projectId,
    templateOrigin: template.origin,
    generatedAt: new Date(),
    branding: branding.branding,
  });

  const library = readTemplateLibrary();
  const assets: Record<string, RenderAsset> = {};
  for (const file of templateAssets.files) assets[file.path] = file.bytes;
  if (branding.asset) assets[branding.asset.path] = branding.asset.bytes;
  assets[library.path] = library.source;

  const outcome = await renderPdf(
    renderUrl,
    { template: template.source, data: document, assets },
    request.signal
  );

  if (!outcome.ok) {
    if (outcome.kind === 'compile_error') {
      console.error(`[console] Typst compile error for ${template.absolutePath}:`, outcome.detail);
      return noStore(
        NextResponse.json(
          {
            error: 'template_compile_error',
            message: `The consumption report template did not compile (${template.origin}: ${template.absolutePath}).`,
            detail: outcome.detail,
          },
          { status: 422 }
        )
      );
    }
    console.error('[console] typst-render could not produce the consumption report:', outcome);
    return noStore(
      NextResponse.json(
        {
          error: outcome.kind === 'unreachable' ? 'renderer_unreachable' : 'renderer_error',
          message: 'The report renderer could not produce this PDF.',
          detail: outcome.detail,
        },
        { status: 502 }
      )
    );
  }

  return finish(outcome.pdf, 'application/pdf', month, 'pdf', usage.rotated);
}

async function finish(
  body: BodyInit,
  contentType: string,
  month: string,
  extension: 'csv' | 'pdf',
  rotated: Parameters<typeof writeSession>[1] | null
): Promise<NextResponse> {
  const response = new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="consumption-${month}.${extension}"`,
      'Cache-Control': 'no-store',
    },
  });
  if (rotated) await writeSession(response, rotated);
  return response;
}
