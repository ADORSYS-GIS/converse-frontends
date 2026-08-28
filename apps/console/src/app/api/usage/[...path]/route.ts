import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '../../../../server/env';
import { proxyRequest } from '../../../../server/proxy';
import { usageTargetUrl } from '../../../../server/proxy-target';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `POST /api/usage/{...path}` -> the usage backend (e.g. `POST /usage/v1/usage/query`).
 *
 * `USAGE_URL` being unset is a real, expected deployment state while the usage backend is not yet
 * reachable — this answers `503` rather than pretending, so the Overview's usage panels can render
 * their honest inline "unavailable" status instead of an empty chart that looks like zero usage.
 *
 * #304 wired this route's first (and, by ADR 0009 Decision 3, only sanctioned) caller:
 * `apps/console/src/client/usage-client.ts`'s `queryUsage()`, itself calling `packages/api-rest`'s
 * generated `queryUsage` SDK function against this same-origin path — never the usage backend
 * directly. This is the console's only path to that backend; the browser never holds its URL or a
 * token for it, same as the CRUD/budget proxies above.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const usageUrl = serverEnv().usageUrl;
  if (!usageUrl) {
    return NextResponse.json(
      { error: 'usage_backend_not_configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return proxyRequest(request, {
    resolveTarget: () => usageTargetUrl(usageUrl, path),
  });
}
