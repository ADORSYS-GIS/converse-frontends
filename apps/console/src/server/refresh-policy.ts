import type { ConsoleSession, SessionTokens } from './session';

/**
 * The refresh *decision* layer, extracted as pure functions so it can be tested without a Next
 * server, a Keycloak, or a clock.
 *
 * Semantics are a deliberate, one-for-one port of `packages/authz-rpc/src/runtime.ts`
 * (`AuthzRpcRuntime`) — the console moves the same behaviour from the browser to the proxy
 * (ADR 0009 Decision 2), it does not redesign it:
 *
 * - **Proactive**: refresh before the call goes out when `expiresAt - now <= 60_000`.
 * - **Reactive**: on an upstream `401`, refresh once and retry the same request once.
 * - **De-dup**: concurrent refreshes for one session share a single in-flight promise.
 * - **Cooldown**: a failed refresh suppresses further attempts for 60s, so a dead refresh token
 *   does not trigger a token request per proxied call.
 */

export const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
export const REFRESH_COOLDOWN_MS = 60 * 1000;

export type RefreshState = {
  /** Epoch ms until which refreshing is suppressed after a failure. `0` = no cooldown. */
  cooldownUntil: number;
};

export function isInCooldown(state: RefreshState, now: number): boolean {
  return now < state.cooldownUntil;
}

export function nextCooldownUntil(now: number): number {
  return now + REFRESH_COOLDOWN_MS;
}

/** `expiresAt - now <= TOKEN_REFRESH_BUFFER_MS`, matching `tryProactiveRefresh()` exactly. */
export function isExpiringWithinBuffer(
  expiresAt: number | undefined,
  now: number,
  bufferMs: number = TOKEN_REFRESH_BUFFER_MS
): boolean {
  if (!expiresAt) return false;
  return expiresAt - now <= bufferMs;
}

export type ProactiveInput = {
  tokens: Pick<SessionTokens, 'refreshToken' | 'expiresAt'>;
  now: number;
  state: RefreshState;
};

/**
 * Whether to refresh *before* forwarding. Mirrors `tryProactiveRefresh()`: no refresh token, an
 * absent `expiresAt`, or an active cooldown all mean "don't".
 */
export function shouldRefreshProactively({ tokens, now, state }: ProactiveInput): boolean {
  if (!tokens.refreshToken) return false;
  if (isInCooldown(state, now)) return false;
  return isExpiringWithinBuffer(tokens.expiresAt, now);
}

export type ReactiveInput = {
  upstreamStatus: number;
  tokens: Pick<SessionTokens, 'refreshToken'>;
  now: number;
  state: RefreshState;
  /** True once this request has already spent its single retry. */
  alreadyRetried: boolean;
};

/**
 * Whether to refresh *after* an upstream response. Mirrors `authenticatedFetch()`: only a `401`,
 * only once per request, only with a refresh token, only outside the cooldown.
 */
export function shouldRefreshReactively({
  upstreamStatus,
  tokens,
  now,
  state,
  alreadyRetried,
}: ReactiveInput): boolean {
  if (upstreamStatus !== 401) return false;
  if (alreadyRetried) return false;
  if (!tokens.refreshToken) return false;
  return !isInCooldown(state, now);
}

/**
 * The refreshed session that replaces the cookie. `sid` is preserved on purpose — it keys the
 * de-dup/cooldown maps, and a refresh continues the same login rather than starting a new one.
 * A rotated refresh token replaces the old one; Keycloak omitting one means "keep using the
 * current one", the same fallback `refreshAccessToken()` makes today.
 */
export function rotateSession(
  session: ConsoleSession,
  tokens: SessionTokens,
  roles?: string[]
): ConsoleSession {
  return {
    sid: session.sid,
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? session.tokens.refreshToken,
      idToken: tokens.idToken ?? session.tokens.idToken,
      expiresAt: tokens.expiresAt,
      audience: tokens.audience,
    },
    user: roles ? { ...session.user, roles } : session.user,
  };
}

/**
 * Per-instance refresh coordinator: one in-flight promise and one cooldown deadline per session id.
 *
 * Per-instance is the correct scope here. The de-dup exists to stop a single browser's burst of
 * parallel RPC calls from firing N token requests; it is not a distributed lock, and Keycloak
 * tolerates a concurrent refresh from another replica. The cooldown likewise only needs to be
 * good enough to stop a hot loop on one node.
 */
export class RefreshCoordinator {
  private readonly states = new Map<string, RefreshState>();
  private readonly inFlight = new Map<string, Promise<ConsoleSession | null>>();

  /** Bounds the map so a long-lived instance cannot accumulate one entry per session forever. */
  constructor(private readonly maxSessions = 5000) {}

  stateFor(sid: string): RefreshState {
    let state = this.states.get(sid);
    if (!state) {
      state = { cooldownUntil: 0 };
      if (this.states.size >= this.maxSessions) {
        const oldest = this.states.keys().next();
        if (!oldest.done) this.states.delete(oldest.value);
      }
      this.states.set(sid, state);
    }
    return state;
  }

  markFailed(sid: string, now: number): void {
    this.stateFor(sid).cooldownUntil = nextCooldownUntil(now);
  }

  markSucceeded(sid: string): void {
    this.stateFor(sid).cooldownUntil = 0;
  }

  /**
   * Runs `perform` at most once per session at a time; concurrent callers await the same promise.
   * Resolving `null` means the refresh failed and the session is dead — the caller clears the
   * cookie and answers `401`.
   */
  async run(
    sid: string,
    now: number,
    perform: () => Promise<ConsoleSession | null>
  ): Promise<ConsoleSession | null> {
    const existing = this.inFlight.get(sid);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const refreshed = await perform();
        if (refreshed) {
          this.markSucceeded(sid);
        } else {
          this.markFailed(sid, now);
        }
        return refreshed;
      } catch {
        this.markFailed(sid, now);
        return null;
      } finally {
        this.inFlight.delete(sid);
      }
    })();

    this.inFlight.set(sid, promise);
    return promise;
  }
}
