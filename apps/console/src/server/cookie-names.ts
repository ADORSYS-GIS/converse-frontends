/**
 * Cookie names and the chunk-slot arithmetic — deliberately free of `node:crypto`.
 *
 * `middleware.ts` runs on the edge runtime, which has no `node:crypto`, and it needs to know
 * whether the first session chunk is present. Splitting these constants out of `./session.ts`
 * (which does HKDF and JWE) is what keeps the middleware bundle buildable.
 */

export const SESSION_COOKIE_NAME = 'lb_console_session';
export const AUTH_STATE_COOKIE_NAME = 'lb_console_auth_state';

/**
 * Per-chunk ciphertext budget. Browsers cap a single cookie at ~4096 bytes *including* the name,
 * attributes and separators; a sealed session carrying three Keycloak JWTs routinely exceeds that
 * on its own. Splitting at 3500 leaves ample room for `lb_console_session.N=` plus the attribute
 * string.
 */
export const MAX_COOKIE_CHUNK_LENGTH = 3500;

/** Hard ceiling on how many chunks are ever written or read back. */
export const MAX_COOKIE_CHUNKS = 8;

export function chunkCookieName(index: number): string {
  return `${SESSION_COOKIE_NAME}.${index}`;
}

/** Every chunk slot, including ones a previous larger session may have written. */
export function allSessionCookieNames(): string[] {
  return Array.from({ length: MAX_COOKIE_CHUNKS }, (_, index) => chunkCookieName(index));
}
