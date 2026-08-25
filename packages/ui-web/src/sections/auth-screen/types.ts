/**
 * `idle` — the ordinary sign-in doorway.
 * `redirecting` — the primary button is mid-redirect to the identity provider (README §5.5:
 *   "the button becomes `--muted` with the label `Redirecting…`; no spinner").
 * `error` — the IdP callback failed; an `ErrorLine` renders under the button with the
 *   provider's reason as a sentence, never a raw OIDC error code.
 */
export type AuthScreenStatus = 'idle' | 'redirecting' | 'error';

export interface AuthScreenProps {
  logoSrc?: string;
  logoAlt?: string;
  wordmark?: string;
  status?: AuthScreenStatus;
  /** Redirect-to-IdP callback -- fires on sign-in press, never a direct navigation the page owns. */
  onSignIn: () => void;
  /**
   * When set, renders an `InlineStatus` line above the button -- the signed-out variant
   * (README §5.5: "Your session ended · signed out 2 minutes ago", never a modal or toast).
   */
  signedOutMessage?: string;
  /** Provider's failure reason as a sentence (README §5.5: "never a raw OIDC error code"). */
  errorMessage?: string;
  /** Present only when `status` is `'error'` -- the "Try again" ghost button. */
  onRetry?: () => void;
  className?: string;
}
