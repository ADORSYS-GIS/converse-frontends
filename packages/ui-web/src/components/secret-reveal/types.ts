export type SecretRevealProps = {
  /** e.g. "New key created — shown once" */
  heading: string;
  /** Inter prose explaining the secret cannot be retrieved again. */
  description: string;
  secret: string;
  /** Explicit `×` dismissal only — no blur/backdrop dismissal. */
  onDismiss: () => void;
  /** Label shown on the Copy button after a successful copy, before it reverts. Defaults to "Copied". */
  copiedLabel?: string;
  /** How long the copied confirmation stays visible, in ms. Defaults to 2000. */
  copiedTimeoutMs?: number;
  className?: string;
};
