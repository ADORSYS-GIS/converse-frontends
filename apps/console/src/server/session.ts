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
  tokens: SessionTokens;
  user: SessionUser;
};

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

export async function sealSession(session: ConsoleSession, secret: string): Promise<string> {
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .encrypt(deriveSessionKey(secret));
}

/**
 * Returns `null` for anything that does not decrypt to a well-formed session. Never throws.
 *
 * `permissions`/`accessVerified` are NORMALISED rather than required by `isConsoleSession`: a
 * cookie sealed before converse-frontends#452 carries neither, and rejecting it outright would
 * sign every live session out at deploy time to reach the exact state normalising already
 * produces — the fail-closed empty permission set, flagged unverified, with the chrome's own
 * "access could not be verified — retry sign-in" line telling the person what to do. Normalising
 * fails closed; only the presentation differs, and it differs in the honest direction.
 */
export async function openSession(token: string, secret: string): Promise<ConsoleSession | null> {
  try {
    const { payload } = await jwtDecrypt(token, deriveSessionKey(secret));
    const session = (payload as { session?: unknown }).session;
    if (!isConsoleSession(session)) return null;
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
    typeof candidate.tokens?.accessToken === 'string' &&
    typeof candidate.user?.sub === 'string' &&
    Array.isArray(candidate.user?.roles)
  );
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
export async function sealAuthState(payload: AuthStatePayload, secret: string): Promise<string> {
  return new EncryptJWT({ auth: payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .encrypt(deriveSessionKey(secret));
}

export async function openAuthState(
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
