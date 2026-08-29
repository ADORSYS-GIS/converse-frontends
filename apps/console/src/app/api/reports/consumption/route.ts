import { NextResponse, type NextRequest } from 'next/server';

import { refreshSession } from '../../../../server/oidc';
import {
  shouldRefreshProactively,
  shouldRefreshReactively,
  rotateSession,
} from '../../../../server/refresh-policy';
import { serverEnv } from '../../../../server/env';
import {
  clearSession,
  readSessionFromRequest,
  writeSession,
} from '../../../../server/session-store';
import type { ConsoleSession } from '../../../../server/session';
import { usageDispatcher } from '../../../../server/usage-dispatcher';
import {
  aggregateConsumptionRows,
  isValidMonth,
  monthRange,
  streamConsumptionCsv,
  type UsageSeriesPoint,
} from '../../../../server/consumption-csv';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /api/reports/consumption?month=YYYY-MM&account=<id>[&project=<id>]` — ticket #308, ADR
 * 0009 Decision 8. Queries the usage backend server-side (never exposed to the browser directly,
 * Decision 3) and streams a CSV grouped by project × model with totals.
 *
 * `month` alone (the ADR's literal example) is not enough to answer a *safe* query: the usage
 * backend's `scope`/`scope_id` (`openapi/usage.backend.yaml`) determine whose data comes back, and
 * every other screen in this console scopes by the caller's selected account/project (`?account=`/
 * `?project=`, `client/url-state.ts`). Omitting that scope here would mean either querying
 * everything the caller's token can reach (a real data-boundary miss) or guessing — so `account`
 * is required the same way `month` is, and `project` narrows further when the caller has one
 * selected. Both come straight from the same `ScopeSelect` value the report panel already renders
 * (`ManageScopeSlot`).
 */

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function badRequest(error: string, message: string): NextResponse {
  return noStore(NextResponse.json({ error, message }, { status: 400 }));
}

async function queryUsage(
  usageUrl: string,
  accessToken: string,
  body: unknown,
  signal: AbortSignal
): Promise<Response> {
  const dispatcher = usageDispatcher();
  return fetch(`${usageUrl}/usage/v1/usage/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    // Same mTLS client identity the /api/usage proxy presents -- this route talks to the same
    // query listener, just without going through `proxyRequest`. `dispatcher` is undici's, not
    // the WHATWG `RequestInit`'s, hence the cast below.
    ...(dispatcher ? { dispatcher } : {}),
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
  } as RequestInit);
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

  let session = await readSessionFromRequest(request);
  if (!session) {
    return noStore(
      NextResponse.json(
        { error: 'unauthenticated', message: 'No console session. Sign in first.' },
        { status: 401 }
      )
    );
  }

  const usageUrl = serverEnv().usageUrl;
  if (!usageUrl) {
    return noStore(NextResponse.json({ error: 'usage_backend_not_configured' }, { status: 503 }));
  }

  const { startTime, endTime } = monthRange(month);
  const queryBody = {
    scope: 'account' as const,
    scope_id: accountId,
    start_time: startTime,
    end_time: endTime,
    group_by: ['project_id', 'model'] as const,
    ...(projectId ? { filters: { project_id: projectId } } : {}),
  };

  /** Rotated onto the response only if a refresh actually ran — mirrors `proxy.ts`'s own
   *  `rotated` variable, minus its `RefreshCoordinator` (a single low-frequency report download
   *  does not need the concurrent-request de-dup that exists for the high-volume RPC proxy). */
  let rotated: ConsoleSession | null = null;
  const now = Date.now();

  if (shouldRefreshProactively({ tokens: session.tokens, now, state: { cooldownUntil: 0 } })) {
    const refreshed = await refreshSession(session);
    if (!refreshed) {
      return sessionExpired();
    }
    session = rotateSession(session, refreshed.tokens, refreshed.roles);
    rotated = session;
  }

  let upstream: Response;
  try {
    upstream = await queryUsage(usageUrl, session.tokens.accessToken, queryBody, request.signal);
  } catch (error) {
    console.error('[console] Usage backend unreachable:', error);
    return noStore(NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 }));
  }

  if (
    shouldRefreshReactively({
      upstreamStatus: upstream.status,
      tokens: session.tokens,
      now: Date.now(),
      state: { cooldownUntil: 0 },
      alreadyRetried: false,
    })
  ) {
    const refreshed = await refreshSession(session);
    if (!refreshed) {
      return sessionExpired();
    }
    session = rotateSession(session, refreshed.tokens, refreshed.roles);
    rotated = session;

    await upstream.body?.cancel().catch(() => undefined);
    try {
      upstream = await queryUsage(usageUrl, session.tokens.accessToken, queryBody, request.signal);
    } catch (error) {
      console.error('[console] Usage backend unreachable on retry:', error);
      return noStore(NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 }));
    }
  }

  if (!upstream.ok) {
    console.error(`[console] Usage backend rejected the consumption query: ${upstream.status}`);
    return noStore(
      NextResponse.json(
        { error: 'upstream_error', message: 'The usage backend could not answer this query.' },
        { status: 502 }
      )
    );
  }

  let payload: { points?: UsageSeriesPoint[] };
  try {
    payload = (await upstream.json()) as { points?: UsageSeriesPoint[] };
  } catch (error) {
    console.error('[console] Usage backend returned an unparsable response:', error);
    return noStore(NextResponse.json({ error: 'upstream_error' }, { status: 502 }));
  }

  const rows = aggregateConsumptionRows(payload.points ?? []);
  const stream = streamConsumptionCsv(rows);

  const response = new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="consumption-${month}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
  if (rotated) {
    await writeSession(response, rotated);
  }
  return response;
}

function sessionExpired(): NextResponse {
  const response = NextResponse.json(
    {
      error: 'session_expired',
      message: 'The console session has expired. Sign in again.',
    },
    { status: 401 }
  );
  clearSession(response);
  return noStore(response);
}
