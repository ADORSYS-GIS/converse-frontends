'use client';

import {
  queryUsage as queryUsageSdk,
  type UsageErrorResponse,
  type UsageQueryRequest,
  type UsageQueryResponse,
} from '@lightbridge/api-rest';

/**
 * The structural slice of an axios error this module actually reads — not imported from `axios`
 * itself: `axios` is a dependency of `@lightbridge/api-rest`, not a direct dependency of this app,
 * and pnpm's strict `node_modules` layout means its TYPES (unlike its runtime code, reached only
 * through the generated client) are not resolvable here without adding it as a direct dependency
 * for the sake of one type import. A structural type is exactly as safe for reading an error's
 * shape, and keeps the direct dependency list honest about what this app actually calls itself.
 */
interface AxiosLikeError<TData> {
  message?: string;
  response?: { data?: TData };
}

/**
 * The typed usage-query path (#304): `packages/api-rest`'s generated `queryUsage`, pointed at the
 * console's OWN `/api/usage/*` proxy — never at the usage backend directly (ADR 0009 Decision 3,
 * same rule `rpc-clients.ts` follows for the CRUD/budget clients). The proxy owns auth (it attaches
 * the Bearer token from the session cookie) and owns refresh, so this file never touches a token —
 * same "no auth closures in the browser" shape as `useConsoleAuthzClient`/`useConsoleBudgetClient`.
 *
 * Unlike those two, this is a **plain stateless function**, not a `useXRpcClient()` hook backed by
 * a module-scope singleton: `packages/api-rest`'s generated axios client accepts a per-call
 * `baseURL` override (`buildUrl()` in `client/client/utils.gen.ts` prefers `options.baseURL` over
 * the instance default), so there is no client to construct, configure or hold onto — every call
 * carries its own target. That also means `useClientInit` (`packages/api-rest/src/hook/client.ts`,
 * built for a caller that holds its own bearer token and refreshes it client-side) is never used
 * here; the console's proxy already does both, and wiring `useClientInit` on top would be a second,
 * conflicting refresh path.
 *
 * `throwOnError: true` is deliberate, not the generated default: the SDK's own axios adapter
 * (`client/client/client.gen.ts`) catches BOTH a real transport/HTTP failure and a
 * `responseValidator` (zod) failure in the same `catch` block, and with the default
 * `throwOnError: false` it returns whichever of those it caught as if it were a same-shaped
 * response object — a caller that only checks `response.data` would read a validation failure as
 * a value. Passing `throwOnError: true` makes every failure (network, non-2xx, or a malformed body
 * that fails `zQueryUsageResponse`) reject the promise instead, so a `try`/`catch` or
 * `useQuery`'s own `isError` is the ONE place either kind of failure is handled — never a crash,
 * and never silently mistaken for a successful empty result (#304's own AC).
 */
function usageProxyBaseUrl(): string {
  return `${window.location.origin}/api/usage`;
}

/**
 * `POST /usage/v1/usage/query` through the console's `/api/usage/*` proxy. Resolves to the typed
 * `UsageQueryResponse`; rejects with the thrown axios/zod failure on any error — callers (React
 * Query `queryFn`s) turn that rejection into their own `isError`/`error` state rather than ever
 * fabricating a zero/empty result from it.
 */
export async function queryUsage(request: UsageQueryRequest): Promise<UsageQueryResponse> {
  const response = await queryUsageSdk({
    baseURL: usageProxyBaseUrl(),
    body: request,
    throwOnError: true,
  });
  return response.data;
}

/** Recognisable subset of what the console's own proxy answers before the request ever reaches
 *  the usage backend (`server/proxy.ts` / `app/api/usage/[...path]/route.ts`) — surfaced with
 *  wording a user can act on, distinct from the usage backend's own `UsageErrorResponse.error`. */
const PROXY_ERROR_MESSAGES: Record<string, string> = {
  usage_backend_not_configured: 'The usage backend is not configured for this environment yet.',
  unauthenticated: 'Your session is missing. Sign in again.',
  session_expired: 'Your session expired. Sign in again.',
  upstream_unreachable: 'The usage backend is unreachable right now.',
  invalid_path: 'The usage query path was rejected.',
  misconfigured: 'The usage proxy is misconfigured.',
};

/**
 * Extracts a human-readable message from whatever `queryUsage` rejected with — an axios-shaped
 * error (network failure or a non-2xx from the proxy/backend, whose body is `{error: string}`
 * either way: the proxy's own `NextResponse.json({error: ...})` shapes or the backend's own
 * `UsageErrorResponse`) or a bare `ZodError` (the response-shape validation failure described in
 * this module's doc comment). Never throws — this is itself the last stop before a message reaches
 * the UI, so it has to degrade to a generic string rather than propagate a second failure.
 */
export function getUsageErrorMessage(error: unknown): string {
  const axiosLikeError = error as AxiosLikeError<UsageErrorResponse | { error?: string }>;
  const code = axiosLikeError?.response?.data?.error;
  if (typeof code === 'string' && code.length > 0) {
    return PROXY_ERROR_MESSAGES[code] ?? code;
  }
  const message = axiosLikeError?.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  return 'Failed to load usage data.';
}
