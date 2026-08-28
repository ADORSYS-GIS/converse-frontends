export interface MutationFailureBannerProps {
  /** The failure message, already flattened to plain text. `undefined`/`null`/`''` renders nothing. */
  message?: string | null;
  /** Dismisses the current failure — the only way it goes away (no auto-timeout). */
  onDismiss: () => void;
  className?: string;
}
