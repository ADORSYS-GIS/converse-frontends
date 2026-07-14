/**
 * Extracts a human-readable message from an error thrown by the generated API client.
 *
 * Backend error responses (see `lightbridge-authz-core::error::Error`'s `IntoResponse`) are
 * plain text, not JSON — e.g. a 403 body is `"Forbidden: missing required permission: ..."`.
 * Axios surfaces that as `error.response.data`; falls back to the generic Axios message.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (typeof data === 'string' && data.trim().length > 0) {
      return data;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return String(error);
}
