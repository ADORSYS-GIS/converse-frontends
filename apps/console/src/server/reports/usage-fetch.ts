import type { NextRequest } from 'next/server';

import { resolveOwnedAccountIds, resolveProjectAccountId } from '../authz-account-lookup';
import { serverEnv } from '../env';
import { refreshSession } from '../oidc';
import {
  rotateSession,
  shouldRefreshProactively,
  shouldRefreshReactively,
} from '../refresh-policy';
import type { ConsoleSession } from '../session';
import { readSessionFromRequest } from '../session-store';
import { isAdmin } from '../tokens';
import { usageDispatcher } from '../usage-dispatcher';
import { guardUsageScope } from '../usage-scope-guard';

/**
 * The ONE server-side path from a report route to `POST /usage/v1/usage/query`
 * (converse-frontends#453).
 *
 * Both report routes now run through here — `/api/reports/page` (the dashboard export) and
 * `/api/reports/consumption` (the monthly report). Before this, the consumption route carried its
 * own copy of the session-refresh dance and its own `fetch`, and applied **no scope guard at
 * all**: it forwarded `scope: 'account', scope_id: <the ?account= param>` with the caller's bearer
 * token and never checked that the caller owned that account. Routing it through this module
 * closes that gap as a side effect of the migration, which is worth stating plainly rather than
 * leaving as a quiet diff.
 *
 * What it owns:
 *
 *  - **The scope guard, per query.** `usage-scope-guard.ts` is the console's entire per-account
 *    authorization story for `scope: 'account'` (the usage backend authenticates the PROXY via
 *    mTLS, not the end caller), so a route that reaches the backend without it is a hole of
 *    exactly the shape that guard was written to close. `isAdmin` is computed from the decrypted
 *    session cookie's own roles — never from anything on the request — which is the contract that
 *    function's doc comment requires of its callers.
 *  - **Ownership resolution ONCE per request.** A dashboard page resolves to several deduplicated
 *    queries; resolving "which accounts does this caller own" per query would be N identical RPC
 *    round-trips. Memoised here, including the failure, so a failed lookup fails every query
 *    closed rather than being retried into a partial pass.
 *  - **The refresh dance.** Proactive refresh before the first query, reactive refresh on a 401
 *    once, then the caller writes the rotated session onto its own response. Same policy the RPC
 *    proxy uses, minus its `RefreshCoordinator`: a report download is one low-frequency request,
 *    not the high-volume path that de-dup exists for.
 *
 * Queries run SEQUENTIALLY, not in parallel. The reactive-refresh retry has to observe one
 * upstream 401 and rotate the session before the next query is sent; a `Promise.all` would fire
 * every query with a token already known to be stale and turn one refresh into N. A dashboard
 * resolves to a handful of queries against a backend on the same cluster, so the wall-clock cost
 * is small and the correctness is not subtle.
 */

/** The wire body, loosely typed on purpose — `resolve-dashboard.ts` deliberately produces plain
 *  strings for `scope`/`group_by`/`filters` so a page can name a dimension the backend does not
 *  have yet, and the backend's own 400 is the honest answer to that.
 *
 *  A LIST filter value is the backend's one set-membership filter, `operation_in`
 *  (lightbridge-authz#648): the report walks the same resolved query list the page issues, so it
 *  has to be able to carry the same filter shapes — `/admin/usage`'s chat-completions panel is a
 *  three-value question, and a report that silently dropped the filter would print the estate's
 *  whole request count under a heading that says "chat completions". */
export interface UsageQueryBody {
  scope: string;
  scope_id: string;
  start_time: string;
  end_time: string;
  bucket?: string;
  group_by?: string[];
  filters?: Record<string, string | string[]>;
  limit?: number;
}

/** One usage response, shaped by what every adapter in this app reads off it. */
export interface UsageQueryPayload {
  points: Record<string, unknown>[];
  truncated?: boolean;
}

export type UsageFetchOutcome =
  | { ok: true; payloads: UsageQueryPayload[]; rotated: ConsoleSession | null }
  | { ok: false; status: number; error: string; message?: string; clearSession?: true };

function fetchOnce(
  usageUrl: string,
  accessToken: string,
  body: UsageQueryBody,
  signal: AbortSignal
): Promise<Response> {
  const dispatcher = usageDispatcher();
  return fetch(`${usageUrl}/usage/v1/usage/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    // The same mTLS client identity `/api/usage/*` presents — this is the same query listener,
    // just reached without `proxyRequest`. `dispatcher` is undici's, not the WHATWG
    // `RequestInit`'s, hence the cast.
    ...(dispatcher ? { dispatcher } : {}),
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
  } as RequestInit);
}

export async function fetchUsageQueries(
  request: NextRequest,
  queries: readonly UsageQueryBody[]
): Promise<UsageFetchOutcome> {
  let session = await readSessionFromRequest(request);
  if (!session) {
    return {
      ok: false,
      status: 401,
      error: 'unauthenticated',
      message: 'No console session. Sign in first.',
    };
  }

  const usageUrl = serverEnv().usageUrl;
  if (!usageUrl) {
    return {
      ok: false,
      status: 503,
      error: 'usage_backend_not_configured',
      message: 'This deployment has no usage backend configured.',
    };
  }

  // ── Guard every query before ANY of them is sent ────────────────────────────────────────────
  // All-or-nothing on purpose: a report that silently omitted the one panel the caller was not
  // allowed to see would be a document asserting a total that is not the total.
  const callerIsAdmin = isAdmin(session.user?.roles ?? []);
  let ownedAccountIds: ReadonlySet<string> | null | undefined;
  const resolveOwnedOnce = async () => {
    if (ownedAccountIds === undefined) {
      ownedAccountIds = await resolveOwnedAccountIds(session!.tokens.accessToken);
    }
    return ownedAccountIds;
  };

  for (const query of queries) {
    const outcome = await guardUsageScope(
      query,
      resolveOwnedOnce,
      (projectId) => resolveProjectAccountId(session!.tokens.accessToken, projectId),
      session.user?.sub,
      callerIsAdmin
    );
    if (!outcome.ok) {
      return { ok: false, status: outcome.status, error: outcome.error };
    }
  }

  let rotated: ConsoleSession | null = null;
  if (
    shouldRefreshProactively({
      tokens: session.tokens,
      now: Date.now(),
      state: { cooldownUntil: 0 },
    })
  ) {
    const refreshed = await refreshSession(session);
    if (!refreshed) return sessionExpired();
    session = rotateSession(session, refreshed.tokens, refreshed.roles);
    rotated = session;
  }

  const payloads: UsageQueryPayload[] = [];
  for (const query of queries) {
    let upstream: Response;
    try {
      upstream = await fetchOnce(usageUrl, session.tokens.accessToken, query, request.signal);
    } catch (error) {
      console.error('[console] Usage backend unreachable:', error);
      return { ok: false, status: 502, error: 'upstream_unreachable' };
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
      if (!refreshed) return sessionExpired();
      session = rotateSession(session, refreshed.tokens, refreshed.roles);
      rotated = session;

      await upstream.body?.cancel().catch(() => undefined);
      try {
        upstream = await fetchOnce(usageUrl, session.tokens.accessToken, query, request.signal);
      } catch (error) {
        console.error('[console] Usage backend unreachable on retry:', error);
        return { ok: false, status: 502, error: 'upstream_unreachable' };
      }
    }

    if (!upstream.ok) {
      console.error(`[console] Usage backend rejected a report query: ${upstream.status}`);
      return {
        ok: false,
        status: 502,
        error: 'upstream_error',
        message: 'The usage backend could not answer this report’s queries.',
      };
    }

    try {
      const payload = (await upstream.json()) as UsageQueryPayload;
      payloads.push({ points: payload.points ?? [], truncated: payload.truncated });
    } catch (error) {
      console.error('[console] Usage backend returned an unparsable response:', error);
      return { ok: false, status: 502, error: 'upstream_error' };
    }
  }

  return { ok: true, payloads, rotated };
}

function sessionExpired(): UsageFetchOutcome {
  return {
    ok: false,
    status: 401,
    error: 'session_expired',
    message: 'The console session has expired. Sign in again.',
    clearSession: true,
  };
}
