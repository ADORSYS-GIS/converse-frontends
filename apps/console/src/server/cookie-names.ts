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

/**
 * Hard ceiling on how many chunks are ever written or read back — and, because every live chunk is
 * echoed back on **every single request**, this is really the console's `Cookie`-header budget.
 *
 * Lowered from 8 to 2 (ADR 0016, D4). The reasoning is arithmetic, not taste:
 *
 * - The seal measured for a real admin — three Keycloak JWTs plus the full 36-entry
 *   `permissions[]` — is **6123 B**, which is exactly **2** chunks, and the `Cookie` header that
 *   comes back on every request is **~6.2 KB** (5381 B measured on a session that took the
 *   fail-closed path and carried no permissions).
 * - Node's own HTTP parser caps the whole request-header block at `http.maxHeaderSize` = **16 KB**
 *   by default, and nginx's `large_client_header_buffers` default is **8 KB** per header. A third
 *   chunk (~9.7 KB) already crosses nginx's default; the old 8-slot ceiling permitted ~28 KB,
 *   which Node itself would answer with a `431` before any route of ours ran.
 * - So "we have 21 877 B of headroom" was never the right mental model. The useful ceiling is 2,
 *   and this constant is what says so.
 *
 * Exceeding it is a hard, logged refusal at seal time (`chunkSealedSession` in `./session.ts`),
 * not a silently truncated cookie set that reassembles into ciphertext which cannot decrypt.
 */
export const MAX_COOKIE_CHUNKS = 2;

export function chunkCookieName(index: number): string {
  return `${SESSION_COOKIE_NAME}.${index}`;
}

/** Every chunk slot, including ones a previous larger session may have written. */
export function allSessionCookieNames(): string[] {
  return Array.from({ length: MAX_COOKIE_CHUNKS }, (_, index) => chunkCookieName(index));
}
