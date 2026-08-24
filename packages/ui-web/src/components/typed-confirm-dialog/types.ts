import type { ReactNode } from 'react';

export type TypedConfirmDialogProps = {
  open: boolean;
  /** e.g. "Revoke ci-deploy?" */
  title: string;
  /** States what survives and what does not. */
  description: ReactNode;
  /** The exact string the user must type to enable the destructive action. */
  objectName: string;
  /** Placeholder for the typed-confirmation input. Defaults to `objectName`. */
  inputPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Kept open with an inline error when a confirmed action fails server-side. */
  error?: string;
};
