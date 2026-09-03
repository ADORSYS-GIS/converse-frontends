import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

import { serverEnv } from './env';
import {
  allSessionCookieNames,
  chunkCookieName,
  chunkSealedSession,
  joinCookieChunks,
  openSession,
  sealSession,
  sessionCookieAttributes,
  type ConsoleSession,
  type SessionTtl,
} from './session';

/**
 * Binds the pure session codec in `./session.ts` to Next's cookie plumbing. Kept separate so the
 * crypto and the chunking stay testable without a request object.
 */

/**
 * The seal TTL, straight off `config.yaml` (ADR 0016, D3.1).
 *
 * There used to be a `SESSION_MAX_AGE_SECONDS = 30 days` constant here that was ONLY the cookie's
 * `Max-Age` — a hint to a browser, with nothing on the server behind it. It is gone: the same
 * `session.maxAgeSeconds` now stamps the seal's `exp` and the cookie's `Max-Age`, so the two can
 * no longer disagree, and a cookie value copied out of a browser stops working when the seal does.
 */
function sessionTtl(): SessionTtl {
  const env = serverEnv();
  return {
    maxAgeSeconds: env.sessionMaxAgeSeconds,
    absoluteMaxAgeSeconds: env.sessionAbsoluteMaxAgeSeconds,
  };
}

function collectChunks(get: (name: string) => string | undefined): Record<string, string> {
  const collected: Record<string, string> = {};
  for (const name of allSessionCookieNames()) {
    const value = get(name);
    if (value !== undefined) collected[name] = value;
  }
  return collected;
}

/** Reads the session off an incoming route-handler request. `null` when absent or undecryptable. */
export async function readSessionFromRequest(request: NextRequest): Promise<ConsoleSession | null> {
  const sealed = joinCookieChunks(collectChunks((name) => request.cookies.get(name)?.value));
  if (!sealed) return null;
  return openSession(sealed, serverEnv().sessionSecrets, sessionTtl());
}

/** Reads the session inside a server component / server action via `next/headers`. */
export async function readSession(): Promise<ConsoleSession | null> {
  const store = await cookies();
  const sealed = joinCookieChunks(collectChunks((name) => store.get(name)?.value));
  if (!sealed) return null;
  return openSession(sealed, serverEnv().sessionSecrets, sessionTtl());
}

/**
 * Writes (or rotates) the session onto a response. Chunks beyond what this session needs are
 * explicitly expired: a refreshed session can be shorter than the one it replaces, and a leftover
 * tail chunk would otherwise be concatenated onto the new ciphertext and break decryption.
 *
 * Re-sealing on refresh is what makes the window SLIDE: `sealSession` stamps a fresh
 * `exp = now + session.maxAgeSeconds` every time, clamped to
 * `session.startedAt + session.absoluteMaxAgeSeconds`. So an active session is never logged out
 * mid-work, and an inactive one dies on its own.
 *
 * Throws `SessionTooLargeError` when the seal needs more than `MAX_COOKIE_CHUNKS` slots. That is
 * deliberate and loud (ADR 0016, D4): the alternative is writing cookie slots nothing reads back,
 * which presents as a login that succeeds and then instantly does not.
 */
export async function writeSession(response: NextResponse, session: ConsoleSession): Promise<void> {
  const env = serverEnv();
  const sealed = await sealSession(session, env.sessionSecrets, sessionTtl());

  let chunks: string[];
  try {
    chunks = chunkSealedSession(sealed);
  } catch (error) {
    console.error('[console] Refusing to write an oversized session cookie:', error);
    throw error;
  }

  const attributes = sessionCookieAttributes(env.sessionMaxAgeSeconds);

  chunks.forEach((chunk, index) => {
    response.cookies.set(chunkCookieName(index), chunk, attributes);
  });

  for (const name of allSessionCookieNames().slice(chunks.length)) {
    response.cookies.set(name, '', { ...sessionCookieAttributes(0), maxAge: 0 });
  }
}

export function clearSession(response: NextResponse): void {
  for (const name of allSessionCookieNames()) {
    response.cookies.set(name, '', { ...sessionCookieAttributes(0), maxAge: 0 });
  }
}
