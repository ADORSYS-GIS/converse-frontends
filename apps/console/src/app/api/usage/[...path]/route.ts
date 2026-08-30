import { NextResponse, type NextRequest } from 'next/server';

import { resolveOwnedAccountIds, resolveProjectAccountId } from '../../../../server/authz-account-lookup';
import { serverEnv } from '../../../../server/env';
import { proxyRequest } from '../../../../server/proxy';
import { usageTargetUrl } from '../../../../server/proxy-target';
import { readSessionFromRequest } from '../../../../server/session-store';
import { usageDispatcher } from '../../../../server/usage-dispatcher';
import { guardUsageScope } from '../../../../server/usage-scope-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

/** `path` segments for the one usage-backend endpoint whose response is scoped by an
 *  attacker-controlled `scope`/`scope_id` field — `openapi/usage.backend.yaml`'s
 *  `/usage/v1/usage/query`. The three `/v1/otel/*` ingestion endpoints this same catch-all route
 *  also proxies carry no such field, so the guard below only ever runs for this one path. */
const USAGE_QUERY_PATH = ['usage', 'v1', 'usage', 'query'];

function isUsageQueryPath(path: string[]): boolean {
  return (
    path.length === USAGE_QUERY_PATH.length &&
    path.every((segment, index) => segment === USAGE_QUERY_PATH[index])
  );
}

/**
 * Runs `guardUsageScope` (`server/usage-scope-guard.ts`) against the request body for
 * `POST /api/usage/usage/v1/usage/query` — see this route's own doc comment for the vulnerability
 * this closes.
 *
 * `null` means "the guard does not apply / cannot run" and the caller should proceed to
 * `proxyRequest` unchanged: no session (`proxyRequest` itself answers the correct `401
 * unauthenticated` — this function does not duplicate that check) is the only such case. Every
 * other outcome is a real `UsageScopeGuardOutcome` the caller turns directly into a response.
 *
 * The request body is read via `request.clone()` rather than `request` itself: `proxyRequest`
 * still needs to read the ORIGINAL body (as raw bytes, to forward verbatim) after this function
 * returns, and a `Request`/`NextRequest` body can only be consumed once. Cloning tees the
 * underlying stream so both reads succeed independently.
 */
async function guardUsageQueryRequest(request: NextRequest) {
  const session = await readSessionFromRequest(request);
  if (!session) return null;

  let rawBody: unknown;
  try {
    rawBody = await request.clone().json();
  } catch {
    return { ok: false as const, status: 400 as const, error: 'invalid_body' as const };
  }

  const accessToken = session.tokens.accessToken;
  return guardUsageScope(
    rawBody,
    () => resolveOwnedAccountIds(accessToken),
    (projectId) => resolveProjectAccountId(accessToken, projectId),
    // Optional chaining, not an invariant: test/session shapes without a user still take the
    // resolver path — the fast-path is an optimization, never a requirement.
    session.user?.sub
  );
}

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
 *
 * **Security review, IA v3 phase 1 (P1):** `proxyRequest` (`server/proxy.ts`) is a byte-forwarder
 * BY DESIGN — it never inspects the payload — so before this fix, ANY signed-in user could send
 * `{"scope": "account", "scope_id": "<any account id>"}` and read that account's usage/spend data,
 * since the only thing the proxy checked was that the CALLER had a valid session, never that the
 * caller owned the account/project named in the body. `guardUsageQueryRequest` closes that gap for
 * the one path (`/usage/v1/usage/query`) whose response is actually scoped by a client-supplied
 * field — the `/v1/otel/*` ingestion endpoints this same catch-all also proxies carry no such
 * field and are left untouched. See `server/usage-scope-guard.ts` for the ownership predicate and
 * `server/authz-account-lookup.ts` for how ownership is resolved.
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

  if (isUsageQueryPath(path)) {
    const guardResult = await guardUsageQueryRequest(request);
    if (guardResult && !guardResult.ok) {
      return noStore(
        NextResponse.json({ error: guardResult.error }, { status: guardResult.status })
      );
    }
  }

  return proxyRequest(request, {
    resolveTarget: () => usageTargetUrl(usageUrl, path),
    // The usage query listener requires a client certificate -- there is no bearer-only path to
    // it (lightbridge-authz#347/#361). `undefined` when unconfigured, which is why `usageUrl`
    // and `usageClientCert` are set together or not at all.
    dispatcher: usageDispatcher(),
  });
}
