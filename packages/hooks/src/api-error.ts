/**
 * Pure, dependency-free helpers for reading errors thrown by the generated RPC client
 * (`@lightbridge/authz-rpc`). This app has no Axios-based client left: `packages/api-rest` is
 * generated but has zero importers anywhere in the repo, so there is no other shape to support.
 *
 * A failed call throws `CratestackRpcError` (`packages/authz-rpc/generated/src/runtime.ts`),
 * which puts the HTTP status and the server's decoded error body directly on the instance --
 * `error.status` and `error.body.message` -- never under an Axios-style `error.response`.
 *
 * Backend error responses (see `lightbridge-authz-core::error::Error`'s `IntoResponse`) are
 * often plain text, not JSON -- e.g. a 403 body is `"Forbidden: missing required permission:
 * ..."`. The generated decoder (`readErrorBody`) only understands cratestack's own `{code,
 * message}` shape, though; a handler that emits something else -- e.g. the RBAC gate's `{error:
 * "..."}` -- can't be parsed, so `readErrorBody` falls back to a placeholder body message like
 * `"RPC call returned status 403 with an unrecognized error body"`. `RPC_PLACEHOLDER_MESSAGE_PATTERN`
 * below detects that placeholder so it's never surfaced to a user verbatim. `readErrorBody`
 * itself is generated output and is not fixed here -- see PR #172's `api-key-create-screen.tsx`
 * for the same detection done locally, ahead of this shared fix, for status-driven copy instead
 * of a raw message.
 *
 * ## What cratestack 0.11.0 changed here (cratestack/cratestack#869)
 *
 * One whole CLASS of response stopped hitting that placeholder. Responses emitted by the tower
 * middleware that wraps the generated router -- the rate limiter's 429, its store-failure refusal,
 * the idempotency layer's conflicts -- used to be bare `text/plain` bodies, so the CBOR decoder
 * threw and every one of them arrived as `"RPC call returned status 429 with an undecodable error
 * body"` and was flattened to `GENERIC_ERROR_MESSAGE`. As of 0.11.0 they carry the same
 * codec-negotiated `{code, message}` envelope as everything else, negotiated off the same `Accept`
 * header, so they now decode cleanly and `body.message` is a real string.
 *
 * That is an improvement in the transport and a REGRESSION in the copy, which is why
 * `INFRASTRUCTURE_CODE_MESSAGES` exists below. The messages those layers put on the wire are
 * written for an operator reading a log, not for someone looking at the console: a throttle says
 * `"rate limit exceeded"`, and a rate-limit store outage says `"rate limit store temporarily
 * unavailable"` (`cratestack-redis`'s `STORE_UNAVAILABLE_MESSAGE`) -- which names an internal
 * component the user has no idea exists and cannot act on. Surfacing those verbatim would be
 * strictly worse than the generic fallback they used to get. So the error's `code` is consulted
 * first, and for the codes only this class of response produces, the copy is ours.
 *
 * The 503 arm matters more than it looks: `lightbridge-authz` pins the rate limiter to
 * `StoreErrorPolicy::Deny` (see that repo's `RATE_LIMIT_STORE_ERROR_POLICY`), so a Redis outage
 * REFUSES rate-limited calls rather than serving them unthrottled. `unavailable` is what the
 * console sees while that lasts, and "try again in a moment" is exactly the right thing to say
 * about a condition that self-heals.
 */

// readErrorBody's own fallback text (packages/authz-rpc/generated/src/runtime.ts) always starts
// this way when it can't parse a real error body -- it only restates the status the caller
// already knows, never anything a user should read.
const RPC_PLACEHOLDER_MESSAGE_PATTERN = /^RPC call returned status \d+/;

// Shown whenever nothing better is available: the placeholder above, or a thrown value with no
// usable message at all.
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Our own copy for the RPC error codes whose server-side message is written for an operator, not
 * a user. Keyed on `CratestackRpcError.code` -- the gRPC-style lowercase vocabulary the `/rpc/*`
 * binding emits (`RpcErrorBody`), NOT the screaming-snake `TOO_MANY_REQUESTS` the REST binding
 * uses; every call this app makes goes through `/rpc/<op_id>`.
 *
 * Deliberately only these two. Both are produced by the tower middleware described in the module
 * comment, both became decodable in cratestack 0.11.0, and both name infrastructure. Every other
 * code in the union -- `not_found`, `permission_denied`, `conflict`, `invalid_argument` and the
 * rest -- comes from a real handler whose message was written to be read by whoever made the call,
 * so overriding those would lose information rather than protect anyone. `deadline_exceeded` and
 * `canceled` exist in the generated union but nothing in this stack emits them; they are left out
 * rather than mapped speculatively.
 */
const INFRASTRUCTURE_CODE_MESSAGES: Readonly<Record<string, string>> = {
  // 429 from `RateLimitLayer`. Wire message: "rate limit exceeded".
  resource_exhausted: 'Too many requests. Please wait a moment and try again.',
  // 503. Wire message: "rate limit store temporarily unavailable" / "rate limit store timed out",
  // or any other `CratestackError::Unavailable` a handler raises. Self-healing by definition.
  unavailable: 'The service is temporarily unavailable. Please try again in a moment.',
};

/** The error's RPC code, when it is a `CratestackRpcError` (set directly on the instance). */
function getApiErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) {
      return code;
    }
  }
  return undefined;
}

/**
 * Extracts a human-readable message from an error thrown by the generated RPC client. Takes our
 * own copy first for the infrastructure codes in `INFRASTRUCTURE_CODE_MESSAGES`; otherwise prefers
 * `CratestackRpcError.body.message` (the server's decoded error body); falls back to the error's
 * own `.message` for anything else thrown (e.g. `CratestackRpcTransportError` for a network
 * failure); falls back to `String(error)` as a last resort so this never throws.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    // Before `body.message`, not after: for these codes the decoded server message is precisely
    // what must NOT be shown (see `INFRASTRUCTURE_CODE_MESSAGES`), so reading it first and
    // overriding afterwards would be the same logic written backwards.
    const infrastructureMessage = INFRASTRUCTURE_CODE_MESSAGES[getApiErrorCode(error) ?? ''];
    if (infrastructureMessage) {
      return infrastructureMessage;
    }
    const body = (error as { body?: unknown }).body;
    if (body && typeof body === 'object') {
      const bodyMessage = (body as { message?: unknown }).message;
      if (typeof bodyMessage === 'string' && bodyMessage.trim().length > 0) {
        return RPC_PLACEHOLDER_MESSAGE_PATTERN.test(bodyMessage)
          ? GENERIC_ERROR_MESSAGE
          : bodyMessage;
      }
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return String(error);
}

/**
 * Extracts the HTTP status code from an error thrown by the generated RPC client, when present.
 * `CratestackRpcError.status` is set directly on the instance -- see the module comment above for
 * the full shape. Needed to distinguish a `403` (permission denied, not retryable) from any other
 * failure (network/5xx, retryable via the same idempotency key where applicable).
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return undefined;
}

export function isPermissionDeniedError(error: unknown): boolean {
  return getApiErrorStatus(error) === 403;
}
