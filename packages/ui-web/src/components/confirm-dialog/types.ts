import type { ReactNode } from 'react';

/**
 * A plain yes/no confirmation gate — the LIGHT sibling of `TypedConfirmDialog`.
 *
 * The two are not interchangeable and the choice is not a matter of taste: `TypedConfirmDialog`
 * exists for an action that destroys something a reload cannot bring back (revoking a key,
 * deleting an account), and buys certainty by making the caller type the object's name.
 * `ConfirmDialog` is for an action that discards only unsaved local work — "you are about to
 * overwrite the draft you just typed" — where a name to type does not exist and demanding one
 * would be theatre. Reach for the typed one whenever the loss survives the tab closing.
 */
export type ConfirmDialogProps = {
  open: boolean;
  /** e.g. "Replace your draft with the example policy?" */
  title: string;
  /** States what is about to be lost, in the reader's own terms. */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};
