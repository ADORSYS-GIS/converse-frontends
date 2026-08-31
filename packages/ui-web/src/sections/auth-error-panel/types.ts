export interface AuthErrorPanelProps {
  /** Sentence-case explanation. Never a raw OIDC error code (auth-screen's own rule). */
  message?: string;
  /** Optional "start over" target. A plain link, not a button — it is navigation, not an action. */
  retryHref?: string;
  retryLabel?: string;
  className?: string;
}
