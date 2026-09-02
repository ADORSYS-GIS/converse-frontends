/**
 * The page's one input: which outcome the Rust side already decided.
 *
 * `governance-auth`'s loopback listener has finished the `state` check and the token exchange
 * before it writes this document to the socket, so the browser has nothing to determine and
 * nothing to fetch — it is told, via the `data-callback-status` attribute on `<html>` that
 * `index.html` ships as a placeholder and the Rust side rewrites.
 */

export type CallbackStatus = 'success' | 'error';

/** The literal `index.html` ships. Rust rewrites it; seeing it at run time means it did not. */
export const CALLBACK_STATUS_PLACEHOLDER = '__GOVERNANCE_AUTH_CALLBACK_STATUS__';

/** The `<html>` attribute the value is read from — `data-callback-status`. */
export const CALLBACK_STATUS_ATTRIBUTE = 'data-callback-status';

/**
 * Resolves the injected marker to a status.
 *
 * FAIL CLOSED. Only the exact string `success` produces the success page; every other input —
 * the unreplaced placeholder, an empty attribute, a typo, a missing attribute — resolves to
 * `error`. "Unknown" is not a default, and the permissive branch is never the fallback: a page
 * that claims a session the terminal does not have is worse than one that sends the user to read
 * their terminal, which is the source of truth either way.
 */
export function resolveCallbackStatus(marker: string | null | undefined): CallbackStatus {
  return marker === 'success' ? 'success' : 'error';
}

/** Reads the marker off `<html>`. Separate from `resolveCallbackStatus` so that stays pure. */
export function readCallbackStatusMarker(documentElement: Element): string | null {
  return documentElement.getAttribute(CALLBACK_STATUS_ATTRIBUTE);
}
