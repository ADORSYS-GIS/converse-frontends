import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

import { serverEnv } from './env';
import {
  allSessionCookieNames,
  chunkCookieName,
  chunkCookieValue,
  joinCookieChunks,
  openSession,
  sealSession,
  sessionCookieAttributes,
  type ConsoleSession,
} from './session';

/**
 * Binds the pure session codec in `./session.ts` to Next's cookie plumbing. Kept separate so the
 * crypto and the chunking stay testable without a request object.
 */

/** 30 days — an `offline_access` refresh token outlives the SSO session, so the cookie should too. */
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

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
  return openSession(sealed, serverEnv().sessionSecret);
}

/** Reads the session inside a server component / server action via `next/headers`. */
export async function readSession(): Promise<ConsoleSession | null> {
  const store = await cookies();
  const sealed = joinCookieChunks(collectChunks((name) => store.get(name)?.value));
  if (!sealed) return null;
  return openSession(sealed, serverEnv().sessionSecret);
}

/**
 * Writes (or rotates) the session onto a response. Chunks beyond what this session needs are
 * explicitly expired: a refreshed session can be shorter than the one it replaces, and a leftover
 * tail chunk would otherwise be concatenated onto the new ciphertext and break decryption.
 */
export async function writeSession(response: NextResponse, session: ConsoleSession): Promise<void> {
  const sealed = await sealSession(session, serverEnv().sessionSecret);
  const chunks = chunkCookieValue(sealed);
  const attributes = sessionCookieAttributes(SESSION_MAX_AGE_SECONDS);

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
