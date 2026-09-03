/**
 * The `/api/session` contract, shared by the route handler and the browser shell.
 *
 * Token-free by construction (ADR 0009 Decision 2): the browser is told *who* is signed in and
 * *what the backend says they may do*, never *with what credential*.
 *
 * `isAdmin` is GONE (converse-frontends#452, story C9). It was `roles.includes('lightbridge-admin')`
 * — a role production minted for every signed-in person — so it answered `true` for the whole user
 * base and was never a decision anyone had made. What replaces it is `permissions`: the canonical
 * `resource:action` set `procedure.getMyAccess` resolved server-side, carried here verbatim and
 * read through `client/use-can.ts`. The console does not re-derive it, and there is no client-side
 * role → permission map.
 */
export type SessionUserResponse = {
  sub: string;
  /**
   * The PERSON behind the acting account (`users.id`), as `getMyAccess` resolved it — never `sub`,
   * which names the account subject. `/admin/roles` compares it against a grant's `userId` to know
   * the grant is the caller's own. `''` when access could not be verified.
   */
  platformUserId: string;
  name?: string;
  preferredUsername?: string;
  email?: string;
  /** Display/diagnostics only — nothing in the console gates on a role. */
  roles: string[];
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUserResponse | null;
  /** The backend's own answer to "what may this caller do". Empty for an anonymous session. */
  permissions: string[];
  /**
   * `false` means `getMyAccess` could not be reached while the session was built, so `permissions`
   * is the fail-closed empty set rather than a real answer. The chrome renders an `InlineStatus`
   * saying access could not be verified — a person seeing no admin nav deserves to know which of
   * the two reasons applies. Anonymous sessions are `false` too and simply never render chrome.
   */
  accessVerified: boolean;
};

export const ANONYMOUS_SESSION: SessionResponse = {
  authenticated: false,
  user: null,
  permissions: [],
  accessVerified: false,
};
