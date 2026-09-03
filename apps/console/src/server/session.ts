import { hkdfSync, randomUUID } from 'node:crypto';

import { EncryptJWT, jwtDecrypt } from 'jose';

import { MAX_COOKIE_CHUNKS, MAX_COOKIE_CHUNK_LENGTH, chunkCookieName } from './cookie-names';

/**
 * The cookie session (ADR 0009 Decision 2). Tokens live here and **only** here: the payload is
 * encrypted (JWE, `dir` + `A256GCM`) with a key derived from `SESSION_SECRET`, and the cookie is
 * `httpOnly` + `Secure` + `SameSite=Lax`, so page JavaScript can neither read the ciphertext nor
 * the plaintext.
 *
 * Everything in this file is pure or crypto-only — no `next/headers`, no request objects — so the
 * seal/open round trip and the cookie chunking are directly unit-testable.
 */

export type SessionTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** Epoch milliseconds. Same unit the RPC runtime's `getExpiresAt()` uses. */
  expiresAt?: number;
  /** `aud` claim(s) observed on the access token at the time it was issued/refreshed. */
  audience?: string[];
};

export type SessionUser = {
  sub: string;
  name?: string;
  preferredUsername?: string;
  email?: string;
  /**
   * The PERSON behind the acting account (`users.id`), as `getMyAccess` resolved it — NOT `sub`,
   * which is the account subject. `platform_role_grants` is keyed on the person (ADR-0026: one
   * human may own several accounts, and a platform role follows them across all of them), so this
   * is what `/admin/roles` compares a grant against to know it is the caller's own.
   *
   * Empty string when `getMyAccess` could not be reached — which can only cost an extra
   * confirmation warning, never suppress one.
   */
  platformUserId: string;
  /** The raw role strings off the access token, as `getMyAccess` echoed them back. Kept for
   *  display/diagnostics only — nothing in the console gates on a role any more. */
  roles: string[];
  /**
   * The canonical `resource:action` strings `procedure.getMyAccess` resolved those roles into,
   * server-side, at login and on every refresh. This is the ONLY input to every gate in the app
   * (`server/access.ts`, `client/use-can.ts`) — the console never re-derives it from `roles`.
   */
  permissions: string[];
  /**
   * Whether `getMyAccess` actually answered. `false` means the call failed and `permissions` is
   * the fail-closed empty set — NOT "this person legitimately has no permissions". The chrome
   * renders an `InlineStatus` for it so an unverified session reads as a degraded state rather
   * than as an empty nav (converse-frontends#452, negative AC 1).
   */
  accessVerified: boolean;
};

export type ConsoleSession = {
  /** Stable per-login id. Keys the server-side refresh de-dup / cooldown maps. */
  sid: string;
  /**
   * Epoch milliseconds of the ORIGINAL login — set once by `exchangeCode`, carried unchanged
   * through every token refresh by `rotateSession`.
   *
   * This is what bounds the sliding window (ADR 0016, D3.1). Each re-seal pushes the JWE `exp`
   * out by `session.maxAgeSeconds`, so an actively-used session never expires under someone; but
   * `session.absoluteMaxAgeSeconds` measured from THIS value caps how long that can go on, so a
   * stolen cookie cannot be kept alive indefinitely by simply being used. The seal's own `iat` is
   * no use for that — a re-seal resets it — which is exactly why this field exists.
   */
  startedAt: number;
  tokens: SessionTokens;
  user: SessionUser;
};

/**
 * How long a seal is good for. Both values come from `session.maxAgeSeconds` /
 * `session.absoluteMaxAgeSeconds` in `config.yaml` (`server/env.ts`); they are passed in rather
 * than read here so this module stays a pure codec with no config dependency.
 */
export type SessionTtl = {
  /** Sliding window. Each seal gets `exp = now + this`, and doubles as the cookie's `Max-Age`. */
  maxAgeSeconds: number;
  /** Hard cap measured from `ConsoleSession.startedAt`. No amount of activity extends past it. */
  absoluteMaxAgeSeconds: number;
};

/**
 * Clock skew allowed when checking `exp`. Console replicas and the browser do not share a clock,
 * and a session that vanishes 4 seconds early because one pod's NTP drifted is a worse failure
 * than one that survives 30 seconds too long.
 */
export const SESSION_CLOCK_TOLERANCE_SECONDS = 30;

/** The user shape `/api/session` hands the browser — deliberately token-free. */
export type SanitizedUser = SessionUser;

export {
  AUTH_STATE_COOKIE_NAME,
  MAX_COOKIE_CHUNKS,
  MAX_COOKIE_CHUNK_LENGTH,
  SESSION_COOKIE_NAME,
  allSessionCookieNames,
  chunkCookieName,
} from './cookie-names';

export function newSessionId(): string {
  return randomUUID();
}

/**
 * Derives the 32-byte content-encryption key. HKDF rather than a raw
 * `Buffer.from(secret)` so `SESSION_SECRET` can be any sufficiently long string instead of
 * having to be exactly 32 bytes, and so the key is domain-separated from any other use of the
 * same secret.
 */
export function deriveSessionKey(secret: string): Uint8Array {
  return new Uint8Array(hkdfSync('sha256', secret, 'lightbridge-console', 'session-cookie-v1', 32));
}

/**
 * The seal's `exp`, in epoch **seconds**: the sliding window, clamped to the absolute deadline.
 *
 * Exported so a test — and a reader — can check the clamp without decrypting anything.
 * A return value at or below `now` means this session is already past its absolute cap; the seal
 * is still written (a throw here would turn a routine token refresh into a 500), and `openSession`
 * refuses it on the very next request, which lands the person on sign-in.
 */
export function sealExpirySeconds(
  startedAt: number,
  ttl: SessionTtl,
  now: number = Date.now()
): number {
  const nowSeconds = Math.floor(now / 1000);
  const sliding = nowSeconds + ttl.maxAgeSeconds;
  const absolute = Math.floor(startedAt / 1000) + ttl.absoluteMaxAgeSeconds;
  return Math.min(sliding, absolute);
}

/**
 * Seals under the FIRST secret when a list is given — see `openSession` for the rotation contract.
 *
 * Unlike the pre-ADR-0016 version this always stamps an `exp` (ADR 0016, D3.1): without one, a
 * cookie value copied out of a browser stayed valid for as long as `session.secret` lived, and the
 * 30-day `maxAge` that looked like an expiry was only ever advice to a browser.
 */
export async function sealSession(
  session: ConsoleSession,
  secrets: string | readonly string[],
  ttl: SessionTtl,
  now: number = Date.now()
): Promise<string> {
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(sealExpirySeconds(session.startedAt, ttl, now))
    .encrypt(deriveSessionKey(sealingSecret(secrets)));
}

/** The one secret new seals are written under: the first entry, which is the rotation contract. */
export function sealingSecret(secrets: string | readonly string[]): string {
  if (typeof secrets === 'string') return secrets;
  const first = secrets[0];
  if (first === undefined) {
    throw new Error('[console] session.secret resolved to an empty list; cannot seal a session');
  }
  return first;
}

function secretList(secrets: string | readonly string[]): readonly string[] {
  return typeof secrets === 'string' ? [secrets] : secrets;
}

/**
 * Returns `null` for anything that does not decrypt to a live, well-formed session. Never throws.
 *
 * Three refusals live here, and every one of them is indistinguishable to the caller from "no
 * cookie at all" on purpose — `middleware.ts` and the route handlers already redirect an absent
 * session to sign-in, so an expired seal takes the identical path rather than an error page:
 *
 * 1. **No `exp` at all.** `requiredClaims` makes this explicit rather than relying on jose's
 *    "absent `exp` is not expired" default. This is what refuses every cookie sealed before
 *    ADR 0016's follow-up landed — those carry `iat` and nothing else, so they were valid forever
 *    (a seal stamped 400 days in the past opened cleanly; measured, ADR 0016 D3.1). One re-login.
 * 2. **`exp` in the past**, within `SESSION_CLOCK_TOLERANCE_SECONDS` — jose's own check.
 * 3. **Past the absolute cap.** `exp` is already clamped to it at seal time, but re-checking here
 *    against the CURRENT config means lowering `session.absoluteMaxAgeSeconds` takes effect on
 *    the next request instead of waiting out the longest seal already in the wild.
 *
 * `permissions`/`accessVerified` are NORMALISED rather than required by `isConsoleSession`: a
 * cookie sealed before converse-frontends#452 carries neither, and rejecting it outright would
 * sign every live session out at deploy time to reach the exact state normalising already
 * produces — the fail-closed empty permission set, flagged unverified, with the chrome's own
 * "access could not be verified — retry sign-in" line telling the person what to do. Normalising
 * fails closed; only the presentation differs, and it differs in the honest direction.
 */
export async function openSession(
  token: string,
  secrets: string | readonly string[],
  ttl: SessionTtl,
  now: number = Date.now()
): Promise<ConsoleSession | null> {
  const opened = await openSessionWithSecretIndex(token, secrets, ttl, now);
  if (!opened) return null;
  // Debug, not info: this fires on every single request. It is what tells an operator running a
  // rotation whether anyone is still on the old secret before they drop it.
  console.debug(`[console] session opened with session.secret[${opened.secretIndex}]`);
  return opened.session;
}

/**
 * `openSession` plus WHICH secret opened it — index `0` is the current one, anything higher is a
 * session still sealed under a secret that is on its way out (ADR 0016, D3.2).
 *
 * Every secret is tried in order. The cost of a miss is one HKDF plus one failed AES-GCM tag
 * check, so a two- or three-entry list during a rotation is not a measurable expense; the list is
 * expected to be back down to one entry once the rotation completes.
 */
export async function openSessionWithSecretIndex(
  token: string,
  secrets: string | readonly string[],
  ttl: SessionTtl,
  now: number = Date.now()
): Promise<{ session: ConsoleSession; secretIndex: number } | null> {
  const candidates = secretList(secrets);
  for (let secretIndex = 0; secretIndex < candidates.length; secretIndex += 1) {
    const session = await openWithOneSecret(token, candidates[secretIndex], ttl, now);
    if (session) return { session, secretIndex };
  }
  return null;
}

async function openWithOneSecret(
  token: string,
  secret: string,
  ttl: SessionTtl,
  now: number
): Promise<ConsoleSession | null> {
  try {
    const { payload } = await jwtDecrypt(token, deriveSessionKey(secret), {
      clockTolerance: SESSION_CLOCK_TOLERANCE_SECONDS,
      requiredClaims: ['exp'],
      currentDate: new Date(now),
    });
    const session = (payload as { session?: unknown }).session;
    if (!isConsoleSession(session)) return null;
    if (session.startedAt + ttl.absoluteMaxAgeSeconds * 1000 <= now) return null;
    return {
      ...session,
      user: {
        ...session.user,
        platformUserId:
          typeof session.user.platformUserId === 'string' ? session.user.platformUserId : '',
        permissions: Array.isArray(session.user.permissions)
          ? session.user.permissions.filter((entry): entry is string => typeof entry === 'string')
          : [],
        accessVerified: session.user.accessVerified === true,
      },
    };
  } catch {
    return null;
  }
}

function isConsoleSession(value: unknown): value is ConsoleSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ConsoleSession>;
  return (
    typeof candidate.sid === 'string' &&
    // Required, not normalised: `startedAt` is what the absolute cap is measured from, and
    // defaulting a missing one to `now` would hand every re-seal a fresh, unbounded window —
    // precisely the gap this field exists to close. Every seal this code writes carries it, and
    // any seal that does not is already refused for having no `exp`.
    typeof candidate.startedAt === 'number' &&
    Number.isFinite(candidate.startedAt) &&
    typeof candidate.tokens?.accessToken === 'string' &&
    typeof candidate.user?.sub === 'string' &&
    Array.isArray(candidate.user?.roles)
  );
}

/**
 * Raised when a sealed session needs more cookie slots than `MAX_COOKIE_CHUNKS` allows.
 *
 * A distinct class rather than a bare `Error` so a caller can tell "this session is too big" apart
 * from a crypto failure without string-matching a message.
 */
export class SessionTooLargeError extends Error {
  constructor(
    readonly sealedLength: number,
    readonly requiredChunks: number
  ) {
    super(
      `[console] Sealed session is ${sealedLength} bytes and needs ${requiredChunks} cookie ` +
        `chunks, but MAX_COOKIE_CHUNKS is ${MAX_COOKIE_CHUNKS} (${MAX_COOKIE_CHUNKS * MAX_COOKIE_CHUNK_LENGTH} bytes). ` +
        `Every chunk is echoed back on every request, and past ~8 KB of Cookie header an ingress ` +
        `answers 400 and Node answers 431 — neither names the cookie. Shrink what the session ` +
        `carries (see ADR 0016 for the byte-by-byte breakdown) rather than raising the ceiling.`
    );
    this.name = 'SessionTooLargeError';
  }
}

/**
 * `chunkCookieValue` with the ceiling enforced. This is the fail-loud boundary (ADR 0016, D4):
 * writing chunk `MAX_COOKIE_CHUNKS` and beyond would produce cookie slots that
 * `joinCookieChunks` never reads back, so the login would appear to succeed and then the very
 * next request would find ciphertext that cannot decrypt. Refusing at seal time turns a silent,
 * baffling truncation into one logged error naming the actual size.
 */
export function chunkSealedSession(sealed: string): string[] {
  const chunks = chunkCookieValue(sealed);
  if (chunks.length > MAX_COOKIE_CHUNKS) {
    throw new SessionTooLargeError(sealed.length, chunks.length);
  }
  return chunks;
}

/** Splits a sealed session into cookie-sized pieces. A short value still yields exactly one. */
export function chunkCookieValue(
  value: string,
  maxChunkLength: number = MAX_COOKIE_CHUNK_LENGTH
): string[] {
  if (maxChunkLength <= 0) {
    throw new Error('maxChunkLength must be positive');
  }
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += maxChunkLength) {
    chunks.push(value.slice(index, index + maxChunkLength));
  }
  return chunks.length > 0 ? chunks : [''];
}

/**
 * Reassembles `lb_console_session.0..N`. Stops at the first missing index rather than skipping it:
 * a gap means a partially-overwritten cookie set, and concatenating across the hole would produce
 * ciphertext that silently fails to decrypt instead of an honest "no session".
 */
export function joinCookieChunks(cookies: Record<string, string | undefined>): string | null {
  const parts: string[] = [];
  for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
    const part = cookies[chunkCookieName(index)];
    if (part === undefined) break;
    parts.push(part);
  }
  if (parts.length === 0) return null;
  return parts.join('');
}

/** The short-lived login round-trip state: CSRF `state`, the PKCE verifier, and where to land. */
export type AuthStatePayload = {
  state: string;
  codeVerifier: string;
  returnTo: string;
};

/**
 * The login-state cookie is sealed with the same JWE key as the session. `httpOnly` already keeps
 * it out of page JavaScript, so this is defence in depth: it also keeps the PKCE `code_verifier`
 * out of proxy logs, browser cookie inspectors and crash dumps, where a bearer-equivalent secret in
 * plaintext has no business being.
 */
export async function sealAuthState(
  payload: AuthStatePayload,
  secrets: string | readonly string[]
): Promise<string> {
  return new EncryptJWT({ auth: payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .encrypt(deriveSessionKey(sealingSecret(secrets)));
}

/**
 * Tries every secret, same as `openSession`. The auth-state cookie only lives 10 minutes, so this
 * matters for a narrow window — but it is exactly the window a rolling deploy of a new secret
 * lands in, and "your login failed, try again" for everyone mid-flow during a rotation is an
 * avoidable, confusing failure.
 */
export async function openAuthState(
  token: string,
  secrets: string | readonly string[]
): Promise<AuthStatePayload | null> {
  for (const secret of secretList(secrets)) {
    const opened = await openAuthStateWithOneSecret(token, secret);
    if (opened) return opened;
  }
  return null;
}

async function openAuthStateWithOneSecret(
  token: string,
  secret: string
): Promise<AuthStatePayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, deriveSessionKey(secret));
    const auth = (payload as { auth?: unknown }).auth;
    if (typeof auth !== 'object' || auth === null) return null;
    const candidate = auth as Partial<AuthStatePayload>;
    if (
      typeof candidate.state !== 'string' ||
      typeof candidate.codeVerifier !== 'string' ||
      typeof candidate.returnTo !== 'string'
    ) {
      return null;
    }
    return candidate as AuthStatePayload;
  } catch {
    return null;
  }
}

export type CookieAttributes = {
  httpOnly: true;
  secure: true;
  sameSite: 'lax';
  path: '/';
  maxAge?: number;
};

/**
 * `Secure` is unconditional. Chrome, Firefox and Safari all treat `http://localhost` as a trustworthy
 * origin and accept `Secure` cookies there, so local development needs no weakened variant — and a
 * "dev only" escape hatch is exactly the sort of thing that survives into a deploy.
 */
export function sessionCookieAttributes(maxAgeSeconds?: number): CookieAttributes {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...(maxAgeSeconds === undefined ? {} : { maxAge: maxAgeSeconds }),
  };
}
