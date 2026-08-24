/**
 * The `/api/session` contract, shared by the route handler and the browser shell.
 *
 * Token-free by construction (ADR 0009 Decision 2): the browser is told *who* is signed in and
 * whether the Admin group is visible, never *with what credential*.
 */
export type SessionUserResponse = {
  sub: string;
  name?: string;
  preferredUsername?: string;
  email?: string;
  roles: string[];
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUserResponse | null;
  isAdmin: boolean;
};

export const ANONYMOUS_SESSION: SessionResponse = {
  authenticated: false,
  user: null,
  isAdmin: false,
};
