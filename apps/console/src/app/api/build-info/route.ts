import { NextResponse, type NextRequest } from 'next/server';

import { readBackendBuildInfo } from '../../../server/build-info';
import { readSessionFromRequest } from '../../../server/session-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /api/build-info` (lightbridge-authz#573) — the build stamps of the two backends the browser
 * cannot reach on its own: `authz-idp` (no RPC surface) and `authz-usage` (mTLS-only query
 * listener). `authz-api` and `authz-budget` are read by the browser itself over `getBuildInfo`;
 * see `server/build-info.ts` for why the split is deliberate and not an inconsistency.
 *
 * **Session-gated**, even though the upstream `/version` endpoints are themselves unauthenticated.
 * Not because a version string is sensitive — it is not, and anyone can curl the backends directly
 * — but because this route makes the CONSOLE fan out to internal origins on an anonymous caller's
 * behalf. Left open it would be a small unauthenticated probe of the cluster's internal topology
 * ("does this deployment have a usage backend?", "how fast does the IdP answer?"), which is worth
 * nothing to a legitimate user (they are signed in) and worth something to a scanner.
 *
 * Never returns a backend URL, only build stamps — see `readBackendBuildInfo`'s doc comment.
 *
 * Always `200` when the caller has a session, even when both reads fail: the per-service result
 * carries its own `error`/`unavailable` status, and `/settings/info` renders those three states
 * differently. A blanket 502 would collapse "the IdP is down" and "there is no usage backend here"
 * into the same unhelpful blank.
 */
export async function GET(request: NextRequest) {
  const session = await readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'unauthenticated' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const services = await readBackendBuildInfo();
  return NextResponse.json(
    { services },
    // `no-store`, not a short TTL: the whole value of this screen is that it reports what is
    // running RIGHT NOW. A cached answer during a rollout is precisely the wrong answer.
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
