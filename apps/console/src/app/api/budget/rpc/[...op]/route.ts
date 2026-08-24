import type { NextRequest } from 'next/server';

import { serverEnv } from '../../../../../server/env';
import { proxyRequest } from '../../../../../server/proxy';
import { budgetRpcTargetUrl } from '../../../../../server/proxy-target';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `POST /api/budget/rpc/{op_id}` -> `authz-budget`'s `POST /budget/rpc/{op_id}`.
 *
 * Separate from `/api/rpc/*` because the 14 `budget:*`-gated procedures moved onto their own
 * microservice as a hard cutover — calling one through `authz-api` 404s.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ op: string[] }> }
) {
  const { op } = await params;
  return proxyRequest(request, {
    resolveTarget: () => budgetRpcTargetUrl(serverEnv().budgetUrl, op),
  });
}
