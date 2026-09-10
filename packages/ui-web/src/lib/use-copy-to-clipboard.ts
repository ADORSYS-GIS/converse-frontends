import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One copy-to-clipboard behaviour for the whole library.
 *
 * Three components had grown a byte-for-byte identical copy of this — `SecretReveal`,
 * `CreateApiKeyDialog`'s secret field, and `CommandSnippet` — and `BuildInfoCard` would have been
 * the fourth. They are collapsed onto this hook rather than a fifth copy landing: the contract
 * below is subtle enough (three failure modes, one of which is "the API exists but the write was
 * refused") that four independent implementations is four chances to get one of them wrong.
 *
 * # The contract, unchanged from what those three already did
 *
 * **A failed write is silent, and never claims success.** `navigator.clipboard` is `undefined` on
 * an insecure origin, absent in some embedded webviews, and `writeText` rejects outright when the
 * permission is denied. All three cases return without setting `copied`, so the button stays
 * unclaimed and the caller's manual-copy fallback (a focused, selected `<input>`, or the visible
 * value itself) is what the user reaches for. A "Copied" label over a copy that did not happen is
 * worse than no label at all — the user walks away with an empty clipboard believing otherwise.
 *
 * **The acknowledgement is transient and self-cancelling.** `copiedKey` clears after
 * `timeoutMs`, and the pending timer is cleared both on the next copy and on unmount, so a
 * component that unmounts mid-acknowledgement never sets state on a dead tree.
 *
 * # Why a key, not a boolean
 *
 * A single-value component (`SecretReveal`) only ever needs "did the one copy happen"; a component
 * with several copyable values in a list (`BuildInfoCard`: a commit SHA and an image SHA per
 * service) needs to know WHICH one was copied, or every button in the card lights up at once.
 * `copiedKey` covers both — a single-value caller passes any stable string and compares against it.
 */
export interface CopyToClipboard {
  /**
   * The `key` of the most recent successful copy, or `null`. Compare against a row's own key to
   * decide whether to render the "Copied" label on that row alone.
   */
  copiedKey: string | null;
  /**
   * Writes `value` to the clipboard and, only on success, sets `copiedKey` to `key`.
   *
   * `key` defaults to `value` itself, which is what a single-value caller wants: it makes
   * `copiedKey === value` the "this was copied" test without inventing an identifier.
   */
  copy: (value: string, key?: string) => Promise<void>;
}

export function useCopyToClipboard(timeoutMs = 2000): CopyToClipboard {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    async (value: string, key?: string) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          return;
        }
      } catch {
        return;
      }
      setCopiedKey(key ?? value);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopiedKey(null), timeoutMs);
    },
    [timeoutMs]
  );

  return { copiedKey, copy };
}
