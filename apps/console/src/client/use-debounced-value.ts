'use client';

import { useEffect, useState } from 'react';

/**
 * `value`, held back until it has stopped changing for `delayMs`.
 *
 * For a draft that must NOT round-trip through the URL. Every other debounced input in this app is
 * a nuqs param carrying `withOptions({ limitUrlUpdates: debounce(…) })` (`url-state.ts`'s
 * `search` params), which is the right tool whenever the text is genuinely view state. The grant
 * dialog's person search is not: it is a real person's name typed into a form, which ADR 0011
 * Decision 3 keeps out of browser history and out of any link copied from the address bar — so it
 * is local state, and it needs its own debounce.
 *
 * The delay exists because `searchUsers` runs a substring scan over `federated_identities`' three
 * display columns; firing it per keystroke turns typing a name into a dozen table scans.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3): this is the debounce's own latch, not view
   * state. It holds a delayed COPY of a value the caller already owns — putting it anywhere else
   * would mean two homes for one fact, and the value it copies is itself a sanctioned local draft
   * (the grant dialog's person search).
   */
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    // Cleared on every change, which is what makes this a trailing debounce rather than a
    // throttle: only the last value in a burst ever reaches state.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
