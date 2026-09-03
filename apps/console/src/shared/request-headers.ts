/**
 * Internal request headers `middleware.ts` sets and the server tree reads back.
 *
 * Deliberately free of every runtime-specific import: the middleware runs on the edge runtime and
 * the root layout runs on Node, so anything they share has to be importable by both.
 */

/**
 * The path the middleware's session-cookie guard let through, e.g. `/settings/overview?tab=usage`.
 *
 * A server component cannot ask Next which URL it is rendering, and the root layout needs that
 * answer for exactly one thing: building `returnTo` when it finds a session cookie that is present
 * but no longer opens (expired seal, retired secret) and has to send the person to sign in.
 *
 * Its **presence** carries a second fact, and that one matters more: this request came through the
 * guard. The guard's matcher excludes `/api/*` and `/auth/*`, so the header is absent exactly where
 * a redirect to sign-in would be wrong — `/auth/error` and `/auth/signed-out` are pages under the
 * same root layout, and a stale cookie must not bounce someone off the page explaining why their
 * session ended.
 *
 * A client cannot forge this into a redirect: the middleware overwrites it on every guarded
 * request, and the only thing the layout does with the value is put it in a same-origin
 * `/auth/login?returnTo=` link, which `sanitizeReturnTo` re-validates on the way back out.
 */
export const GUARDED_PATHNAME_HEADER = 'x-console-guarded-pathname';
