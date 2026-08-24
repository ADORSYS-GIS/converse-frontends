'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { ANONYMOUS_SESSION, type SessionResponse } from '../shared/session-response';

/**
 * The signed-in identity, as the browser is allowed to know it: name, email, roles. No token ever
 * reaches this context — the shape it carries is `/api/session`'s sanitized body (ADR 0009
 * Decision 2).
 *
 * It is seeded from the server layout, which reads the session cookie directly, so the header
 * renders the right identity on first paint instead of flashing an anonymous shell.
 */
const SessionContext = createContext<SessionResponse>(ANONYMOUS_SESSION);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionResponse;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useConsoleSession(): SessionResponse {
  return useContext(SessionContext);
}
