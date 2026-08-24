import type { NextRequest } from 'next/server';

import { serverEnv } from '../../../../server/env';
import { proxyRequest } from '../../../../server/proxy';
import { rpcTargetUrl } from '../../../../server/proxy-target';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** `POST /api/rpc/{op_id}` -> `authz-api`'s `POST {API_BASE_PATH}/rpc/{op_id}` (CBOR, opaque). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ op: string[] }> }
) {
  const { op } = await params;
  return proxyRequest(request, {
    resolveTarget: () => {
      const env = serverEnv();
      return rpcTargetUrl(env.backendUrl, env.apiBasePath, op);
    },
  });
}
