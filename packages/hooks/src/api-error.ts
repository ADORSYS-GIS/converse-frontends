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
 */

// readErrorBody's own fallback text (packages/authz-rpc/generated/src/runtime.ts) always starts
// this way when it can't parse a real error body -- it only restates the status the caller
// already knows, never anything a user should read.
const RPC_PLACEHOLDER_MESSAGE_PATTERN = /^RPC call returned status \d+/;

// Shown whenever nothing better is available: the placeholder above, or a thrown value with no
// usable message at all.
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Extracts a human-readable message from an error thrown by the generated RPC client. Prefers
 * `CratestackRpcError.body.message` (the server's decoded error body); falls back to the error's
 * own `.message` for anything else thrown (e.g. `CratestackRpcTransportError` for a network
 * failure); falls back to `String(error)` as a last resort so this never throws.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
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
