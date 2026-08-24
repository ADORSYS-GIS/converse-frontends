/**
 * Upstream URL construction for the proxy routes, kept pure so the path handling is unit-testable.
 *
 * The console is the only exposed origin (ADR 0009 Decision 3), which makes these handlers the
 * single place a browser-supplied string becomes part of a server-side URL. Every segment is
 * therefore validated against an allow-list rather than merely escaped: `..`, empty segments and
 * anything outside `[A-Za-z0-9_.-]` are rejected outright, so no request can climb out of the
 * configured base path or address a different host.
 */

const SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class InvalidProxyPathError extends Error {
  constructor(readonly segment: string) {
    super(`Invalid proxy path segment: ${JSON.stringify(segment)}`);
    this.name = 'InvalidProxyPathError';
  }
}

export function assertSafeSegments(segments: string[]): string[] {
  if (segments.length === 0) {
    throw new InvalidProxyPathError('');
  }
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SEGMENT_PATTERN.test(segment)) {
      throw new InvalidProxyPathError(segment);
    }
  }
  return segments;
}

/**
 * `POST /api/rpc/{op}` -> `${backendUrl}${apiBasePath}/rpc/{op}`.
 * `op` is a cratestack op-id (or the literal `batch` for `createBatchLink()`'s envelope).
 */
export function rpcTargetUrl(backendUrl: string, apiBasePath: string, segments: string[]): string {
  const safe = assertSafeSegments(segments);
  return `${backendUrl}${apiBasePath}/rpc/${safe.join('/')}`;
}

/**
 * `POST /api/budget/rpc/{op}` -> `${budgetUrl}/budget/rpc/{op}`. The `/budget` prefix is fixed,
 * not configurable — see `useBudgetRpcClient`'s doc comment in `packages/authz-rpc/src/client.ts`.
 */
export function budgetRpcTargetUrl(budgetUrl: string, segments: string[]): string {
  const safe = assertSafeSegments(segments);
  return `${budgetUrl}/budget/rpc/${safe.join('/')}`;
}

/** `POST /api/usage/{...path}` -> `${usageUrl}/{...path}` (e.g. `usage/v1/usage/query`). */
export function usageTargetUrl(usageUrl: string, segments: string[]): string {
  const safe = assertSafeSegments(segments);
  return `${usageUrl}/${safe.join('/')}`;
}

/**
 * Request headers forwarded upstream. An allow-list, not a deny-list: the browser's own `Cookie`
 * and any client-supplied `Authorization` must never reach a backend, and hop-by-hop headers
 * (`Connection`, `Transfer-Encoding`, …) must not be relayed at all. `Authorization` is added by
 * the proxy afterwards, from the cookie session.
 */
export const FORWARDED_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'accept-language',
  'idempotency-key',
  'if-match',
] as const;

/** Response headers relayed back. `content-length` is omitted: the body is streamed through. */
export const FORWARDED_RESPONSE_HEADERS = ['content-type', 'etag'] as const;

export function pickHeaders(source: Headers, allowed: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of allowed) {
    const value = source.get(name);
    if (value !== null) picked.set(name, value);
  }
  return picked;
}
