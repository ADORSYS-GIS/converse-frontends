import { NextResponse } from 'next/server';

import { getSimilarSymbols } from '../../../../../../../lib/server/admin';

/** Client-fetchable proxy for `getSimilarSymbols` — see `../../graph/route.ts` for why this proxy
 *  layer exists. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id: rawId, nodeId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid repository id' }, { status: 400 });
  }
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit');

  // `nodeId` is already decoded by Next.js's own dynamic-route-segment handling — re-decoding it
  // here would double-decode anything the client had percent-escaped.
  const result = await getSimilarSymbols(id, nodeId, {
    limit: limit ? Number(limit) : undefined,
  });

  if (!result.ok) {
    const status = result.status ?? (result.reason === 'unauthenticated' ? 401 : 502);
    return NextResponse.json({ code: result.reason, detail: result.detail }, { status });
  }
  return NextResponse.json(result.data);
}
