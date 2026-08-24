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
