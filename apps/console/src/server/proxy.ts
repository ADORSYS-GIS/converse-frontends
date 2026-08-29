import { NextResponse, type NextRequest } from 'next/server';

import { refreshSession } from './oidc';
import {
  FORWARDED_REQUEST_HEADERS,
  FORWARDED_RESPONSE_HEADERS,
  InvalidProxyPathError,
  pickHeaders,
} from './proxy-target';
import {
  RefreshCoordinator,
  rotateSession,
  shouldRefreshProactively,
  shouldRefreshReactively,
} from './refresh-policy';
import type { ConsoleSession } from './session';
import { clearSession, readSessionFromRequest, writeSession } from './session-store';

/**
 * The dumb byte-forwarder (ADR 0009 Decision 7).
 *
 * What it does: attach the Bearer token from the cookie session, own refresh, forward the request
 * body verbatim, stream the response back.
 *
 * What it deliberately does **not** do: look at the payload. The console's cratestack client runs
 * in the browser and speaks CBOR; this layer never decodes a byte of it, so it cannot drift from
 * the wire format and never has to know about any `Option<T>`/`undefined`-handling gotcha in
 * `packages/authz-rpc/src/codec.ts` (see that module's doc comment for the current codec's
 * `undefined`-handling behavior).
 *
 * The request body *is* buffered (not streamed) because the reactive 401 path has to replay the
 * exact same bytes with a fresh token, and a consumed stream cannot be replayed. RPC payloads are
 * small; the response, which can be large, is streamed straight through.
 */

/** One coordinator per server instance — see `RefreshCoordinator`'s doc comment on that scope. */
const coordinator = new RefreshCoordinator();

/** The JSON body a client interprets as "your session is gone, start the login flow again". */
export const SESSION_EXPIRED_BODY = {
  error: 'session_expired',
  message: 'The console session has expired. Sign in again.',
} as const;

export const UNAUTHENTICATED_BODY = {
  error: 'unauthenticated',
  message: 'No console session. Sign in first.',
} as const;

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function sessionExpired(): NextResponse {
  const response = NextResponse.json(SESSION_EXPIRED_BODY, { status: 401 });
  clearSession(response);
  return noStore(response);
}

async function performRefresh(session: ConsoleSession): Promise<ConsoleSession | null> {
  const refreshed = await refreshSession(session);
  if (!refreshed) return null;
  return rotateSession(session, refreshed.tokens, refreshed.roles);
}

async function forward(
  targetUrl: string,
  method: string,
  headers: Headers,
  body: ArrayBuffer | undefined,
  accessToken: string,
  signal: AbortSignal
): Promise<Response> {
  const upstreamHeaders = new Headers(headers);
  upstreamHeaders.set('Authorization', `Bearer ${accessToken}`);
  return fetch(targetUrl, {
    method,
    headers: upstreamHeaders,
    body,
    signal,
    // Never let a redirect from a backend turn into a request the console did not intend.
    redirect: 'manual',
    cache: 'no-store',
  });
}

export type ProxyOptions = {
  /** Resolves the upstream URL. Throws `InvalidProxyPathError` for a rejected path. */
  resolveTarget: () => string;
};

/**
 * Proxies one request. Refresh behaviour mirrors `AuthzRpcRuntime` exactly (see
 * `./refresh-policy.ts`): proactive at the 60s buffer, reactive retry-once on a `401`, de-duplicated
 * per session, with a 60s cooldown after a failure. A successful refresh rotates the session cookie
 * on this very response; a failed one clears it and answers `401 session_expired`.
 */
export async function proxyRequest(
  request: NextRequest,
  { resolveTarget }: ProxyOptions
): Promise<NextResponse> {
  let targetUrl: string;
  try {
    targetUrl = resolveTarget();
  } catch (error) {
    if (error instanceof InvalidProxyPathError) {
      return noStore(
        NextResponse.json({ error: 'invalid_path', message: error.message }, { status: 400 })
      );
    }
    console.error('[console] Proxy target resolution failed:', error);
    return noStore(NextResponse.json({ error: 'misconfigured' }, { status: 500 }));
  }

  let session = await readSessionFromRequest(request);
  if (!session) {
    return noStore(NextResponse.json(UNAUTHENTICATED_BODY, { status: 401 }));
  }

  const body = await request.arrayBuffer();
  const headers = pickHeaders(request.headers, FORWARDED_REQUEST_HEADERS);

  /** The session to write back, when a refresh produced a new one. */
  let rotated: ConsoleSession | null = null;
  /**
   * Whether this request has already spent its single upstream retry. Deliberately separate from
   * `rotated`: `AuthzRpcRuntime.authenticatedFetch` retries once on a 401 *regardless* of whether a
   * proactive refresh already ran on the same call, and conflating the two would silently drop the
   * reactive retry for every request that happened to land inside the 60s buffer.
   */
  let retried = false;
  const now = Date.now();

  if (
    shouldRefreshProactively({
      tokens: session.tokens,
      now,
      state: coordinator.stateFor(session.sid),
    })
  ) {
    const refreshed = await coordinator.run(session.sid, now, () => performRefresh(session!));
    if (!refreshed) {
      return sessionExpired();
    }
    session = refreshed;
    rotated = refreshed;
  }

  let upstream: Response;
  try {
    upstream = await forward(
      targetUrl,
      request.method,
      headers,
      body,
      session.tokens.accessToken,
      request.signal
    );
  } catch (error) {
    console.error('[console] Upstream request failed:', error);
    return noStore(NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 }));
  }

  const reactiveNow = Date.now();
  if (
    shouldRefreshReactively({
      upstreamStatus: upstream.status,
      tokens: session.tokens,
      now: reactiveNow,
      state: coordinator.stateFor(session.sid),
      alreadyRetried: retried,
    })
  ) {
    const refreshed = await coordinator.run(session.sid, reactiveNow, () =>
      performRefresh(session!)
    );
    if (!refreshed) {
      return sessionExpired();
    }
    session = refreshed;
    rotated = refreshed;
    retried = true;

    // Drain the discarded 401 so the connection can be reused rather than reset.
    await upstream.body?.cancel().catch(() => undefined);

    try {
      upstream = await forward(
        targetUrl,
        request.method,
        headers,
        body,
        session.tokens.accessToken,
        request.signal
      );
    } catch (error) {
      console.error('[console] Upstream retry failed:', error);
      return noStore(NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 }));
    }
  }

  // A 401 that survives to here means the access token was refused and could NOT be replaced:
  // either there was no refresh token to use, or the single reactive retry already ran and the
  // fresh token was refused too, or a cooldown from an earlier failure suppressed the attempt.
  // Whichever it was, this session cannot make an authorized call again, so forwarding the
  // upstream 401 verbatim strands the browser: the cookie still decrypts, `/api/session` still
  // answers `authenticated: true`, and every request 401s indefinitely while the UI renders as a
  // signed-in app. Observed in production 2026-08-29 — authz logged
  // `JWT error: ExpiredSignature` in a loop while the console kept resending the dead token,
  // because both refresh predicates short-circuit on a missing `refreshToken` and neither the
  // clear nor the retry ever ran.
  //
  // Clearing the cookie converts that dead end into the recoverable state the client already
  // knows how to handle: `session_expired` is exactly the signal `/auth/login` acts on, and the
  // IdP session is usually still live, so the next navigation re-authenticates silently.
  //
  // Deliberately NOT applied to 403: authz fail-closes an unauthorized *operation* to 403
  // (`rpc_authorize`), which says nothing about the token's validity — ending the session there
  // would sign a user out for opening a page they simply cannot use.
  if (upstream.status === 401) {
    await upstream.body?.cancel().catch(() => undefined);
    return sessionExpired();
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: pickHeaders(upstream.headers, FORWARDED_RESPONSE_HEADERS),
  });
  if (rotated) {
    await writeSession(response, rotated);
  }
  return noStore(response);
}
